# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.4.x   | :white_check_mark: |
| < 0.4   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within RISE, please report it responsibly:

1. **Do NOT open a public GitHub issue**
2. Email security concerns to the maintainers (create an issue asking for contact info if needed)
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 7 days
- **Resolution target**: Within 30 days (depending on severity)

## Security Best Practices

When using RISE in production:

1. **Validate all input**: Use schema validation (e.g., Zod) for commands and events
2. **Implement proper authorization**: Check permissions before executing commands
3. **Use persistent stores**: Replace InMemoryEventStore with a durable database in production
4. **Monitor and log**: Track all domain events for audit purposes

Thank you for helping keep RISE and its users safe!
