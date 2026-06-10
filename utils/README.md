# Health Data Management Utilities

> **Comprehensive CLI tools for managing health connections, syncing data, and generating analytics**

[📖 Full Documentation](../HEALTH_UTILITIES_README.md) | [🔧 Installation Guide](./INSTALL.md) | [💡 Examples](./examples/)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Build utilities
npm run build

# 3. Configure user
node dist/config-manager.js set-user YOUR_USER_ID

# 4. View connections
node dist/health-cli.js connections

# 5. Sync data
node dist/health-cli.js sync terra 7
```

## What's Included

- **health-cli** - Main CLI for connection management and data operations
- **sync-scheduler** - Automated background sync service
- **data-transformer** - Convert and standardize health data formats
- **health-analytics** - Generate reports, statistics, and correlations
- **config-manager** - Centralized configuration management

## Documentation

- **[HEALTH_UTILITIES_README.md](../HEALTH_UTILITIES_README.md)** - Complete documentation
- **[INSTALL.md](./INSTALL.md)** - Installation instructions
- **[examples/](./examples/)** - Usage examples and scripts

## Support

Run health check: `node dist/health-cli.js health`

For more information, see the [full documentation](../HEALTH_UTILITIES_README.md).
