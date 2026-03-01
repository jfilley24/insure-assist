# Outbound Signature Chaser Worker

This precise agent is triggered via a combination of DocuSign/HelloSign webhooks and the AMS. If a document envelope sits unsigned for more than 7 days, a CRON job spins up this LiveKit agent to politely call the client and ask them to check their email.
