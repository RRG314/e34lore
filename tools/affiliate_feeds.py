"""Normalize owner-authorized product files. This tool does not fetch or scrape sites."""
from __future__ import annotations
import argparse
import csv
import hashlib
import io
import json
import re
import xml.etree.ElementTree as ET
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from urllib.parse import urlsplit, parse_qs

MAX_BYTES = 4_000_000
MAX_ROWS = 5000
CURRENCIES = {"USD", "EUR", "GBP", "CAD", "AUD"}


def safe_url(value):
    if not isinstance(value, str) or len(value) > 4096 or re.search(r"[\s\\\x00-\x1f\x7f]", value):
        return False
    try:
        u = urlsplit(value)
        if u.scheme != "https" or u.username or u.password or u.port or u.fragment:
            return False
        if not re.fullmatch(r"(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}", u.hostname or ""):
            return False
        return not any(re.fullmatch(r"api_?key|access_?token|client_?secret|password|signature|authorization", k, re.I) for k in parse_qs(u.query))
    except ValueError:
        return False


def timestamp(value):
    if not value:
        return None
    result = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if not result.tzinfo:
        raise ValueError("Observation timestamps need a timezone")
    return result.isoformat()


def read_rows(raw: bytes, kind: str):
    if len(raw) > MAX_BYTES:
        raise ValueError("The feed exceeds 4 MB; split it into authorized batches")
    text = raw.decode("utf-8-sig")
    if "\x00" in text:
        raise ValueError("Use a UTF-8 text feed")
    if kind == "json":
        parsed = json.loads(text)
        rows = parsed.get("products") if isinstance(parsed, dict) else parsed
        if not isinstance(rows, list):
            raise ValueError("JSON must be an array or contain a products array")
    elif kind == "csv":
        reader = csv.DictReader(io.StringIO(text))
        rows = []
        for row in reader:
            if len(rows) >= MAX_ROWS:
                raise ValueError("Split the feed into batches of at most 5000 rows")
            rows.append(row)
    elif kind == "xml":
        if re.search(r"<!\s*(DOCTYPE|ENTITY)", text, re.I):
            raise ValueError("XML document types and entities are not allowed")
        root = ET.fromstring(text)
        rows = []
        stack = [(root, 0)]
        while stack:
            element, depth = stack.pop()
            if depth > 24:
                raise ValueError("XML nesting is too deep")
            stack.extend((child, depth + 1) for child in element)
        for element in root.iter():
            if element.tag.split("}")[-1].lower() in {"product", "item", "entry"}:
                row = {child.tag.split("}")[-1]: "".join(child.itertext()).strip() for child in element}
                row.update({"@" + k: v for k, v in element.attrib.items()})
                rows.append(row)
    else:
        raise ValueError("Supported formats are csv, json and xml")
    if not 1 <= len(rows) <= MAX_ROWS:
        raise ValueError("Use 1 to 5000 product rows")
    return rows


def normalize_feed(raw: bytes, kind: str, merchant: str, source_url: str, authorization_url: str, field_map=None):
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,80}", merchant):
        raise ValueError("Choose a registered retailer ID")
    if not safe_url(source_url) or not safe_url(authorization_url):
        raise ValueError("Record HTTPS source and import-permission evidence without credentials")
    fields = field_map or {}
    allowed = {"retailer_sku", "title", "product_url", "manufacturer", "manufacturer_part_number", "oem_numbers", "price", "price_cents", "currency", "availability", "price_observed_at", "availability_observed_at", "shipping_information", "image_url"}
    if set(fields) - allowed:
        raise ValueError("Unknown normalized field in mapping")
    def get(row, key, default=None):
        source = fields.get(key, key)
        value = row
        for segment in source.split("."):
            value = value.get(segment) if isinstance(value, dict) else None
        return default if value in (None, "") else value
    products, conflicts, errors, duplicates = {}, set(), [], 0
    rows = read_rows(raw, kind)
    for index, row in enumerate(rows, 1):
        try:
            if not isinstance(row, dict):
                raise ValueError("Product must be an object")
            sku, title, url = str(get(row, "retailer_sku", "")).strip(), str(get(row, "title", "")).strip(), get(row, "product_url", "")
            if not 1 <= len(sku) <= 160 or not 2 <= len(title) <= 300 or not safe_url(url):
                raise ValueError("A bounded SKU, title and HTTPS product URL are required")
            numbers = get(row, "oem_numbers", [])
            if isinstance(numbers, str):
                numbers = re.split(r"[,;|]", numbers)
            if not isinstance(numbers, list):
                raise ValueError("OEM numbers must be a list or separated by comma, semicolon or pipe")
            normalized = []
            for number in numbers:
                number = re.sub(r"[ -]", "", str(number).strip())
                if not re.fullmatch(r"[0-9]{11}", number):
                    raise ValueError("An explicit BMW number must contain exactly 11 digits")
                normalized.append(number)
            result = {"retailer_sku": sku, "title": title, "product_url": url, "manufacturer": str(get(row,"manufacturer",""))[:160],
                      "manufacturer_part_number": str(get(row,"manufacturer_part_number",""))[:160], "oem_numbers": sorted(set(normalized))}
            cents, price = get(row,"price_cents"), get(row,"price")
            if cents is not None or price is not None:
                try:
                    amount = Decimal(str(cents)) if cents is not None else Decimal(str(price)) * 100
                    if not amount.is_finite() or amount < 0 or amount > 1_000_000_000_000 or amount != amount.to_integral_value():
                        raise ValueError("Price must be nonnegative with at most two decimal places")
                    result["price_cents"] = int(amount)
                except InvalidOperation as failure:
                    raise ValueError("Use a dot decimal price without currency symbols") from failure
                currency = str(get(row,"currency","")).upper()
                if currency not in CURRENCIES:
                    raise ValueError("Price requires a supported explicit currency")
                result["currency"] = currency
                result["price_observed_at"] = timestamp(get(row,"price_observed_at"))
            stock = get(row,"availability")
            if stock is not None:
                result["availability"] = {"in stock":"in_stock","instock":"in_stock","in_stock":"in_stock","out of stock":"out_of_stock","outofstock":"out_of_stock","out_of_stock":"out_of_stock","backorder":"backorder"}.get(str(stock).strip().lower(),"unknown")
                result["availability_observed_at"] = timestamp(get(row,"availability_observed_at"))
            for field in ("shipping_information", "image_url"):
                value = get(row,field)
                if value:
                    if field == "image_url" and not safe_url(value):
                        raise ValueError("Image candidate must use HTTPS")
                    result[field] = str(value)[:4096 if field=="image_url" else 1000]
            if sku in conflicts:
                raise ValueError("This SKU already has conflicting feed rows")
            if sku in products:
                if products[sku] != result:
                    conflicts.add(sku); products.pop(sku)
                    raise ValueError("Conflicting rows for the same SKU were withheld")
                duplicates += 1
            else:
                products[sku] = result
        except (ValueError, TypeError) as failure:
            errors.append({"row":index,"error":str(failure)})
    return {"merchant_key":merchant,"feed_source_url":source_url,"authorization_evidence_url":authorization_url,"feed_sha256":hashlib.sha256(raw).hexdigest(),
            "format_name":kind,"products":[products[k] for k in sorted(products)],"preview":{"rows_seen":len(rows),"rows_valid":len(products),"duplicates":duplicates,"conflicting_skus":sorted(conflicts),"errors":errors}}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input",required=True,type=Path);parser.add_argument("--format",required=True,choices=["csv","json","xml"])
    parser.add_argument("--merchant",required=True);parser.add_argument("--source-url",required=True);parser.add_argument("--authorization-url",required=True)
    parser.add_argument("--field-map",type=Path);parser.add_argument("--out",required=True,type=Path)
    args=parser.parse_args()
    mapping=json.loads(args.field_map.read_text()) if args.field_map else None
    result=normalize_feed(args.input.read_bytes(),args.format,args.merchant,args.source_url,args.authorization_url,mapping)
    args.out.parent.mkdir(parents=True,exist_ok=True);args.out.write_text(json.dumps(result,indent=2)+"\n")
    print(json.dumps({"rows_seen":result["preview"]["rows_seen"],"rows_valid":result["preview"]["rows_valid"],"duplicates":result["preview"]["duplicates"],"errors":len(result["preview"]["errors"])}))
if __name__ == "__main__": main()
