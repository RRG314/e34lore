"use client";
import {useContext} from "react";
import {AppContext} from "../lib/app-state";
import {seriesHref, seriesRoute, type Series} from "../series/registry";
import type { ComponentProps } from "react";
/** Keep native document navigation on this Vinext deployment. The deployed
 * Next client Link failed to navigate during the v24 workshop verification. */
export function DocumentLink({series, ...props}: ComponentProps<"a"> & {series?: Series}) {
  const app = useContext(AppContext);
  const targetSeries = series ?? app?.series;
  return <a {...props} href={targetSeries && props.href ? seriesHref(props.href, targetSeries) : props.href} />;
}

/** Form actions share the native navigation used by DocumentLink on Vinext. */
export function navigateDocument(path:string){
 if(!path.startsWith('/')||path.startsWith('//'))throw Error('Expected a local page');
 const {series} = seriesRoute(window.location.pathname.split("/").filter(Boolean));
 window.location.assign(new URL(seriesHref(path, series),window.location.origin).href);
}
