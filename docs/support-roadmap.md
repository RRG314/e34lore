# Roadmap and support

The [roadmap](https://e34lore.com/roadmap) lists current and planned features. The [support page](https://e34lore.com/support) handles account and site requests. Use [GitHub issues](../CONTRIBUTING.md) for code, reference data, and documentation changes.

## Support requests

The support Edge Function validates incoming requests and records each ticket and initial message in a private inbox. Staff access requires a live session with multifactor authentication. Outbound delivery uses a queue, so saving a ticket and delivering a reply are separate operations. Email replies return to the ticket through a verified provider webhook.

Use synthetic senders, messages, and attachments when testing. Run the isolated PostgreSQL policy suite from the [development instructions](../README.md#development) to check ticket creation, staff access, and delivery state. Configure email in the maintainer's hosting environment. Keep provider secrets, account details, and delivery receipts outside Git.
