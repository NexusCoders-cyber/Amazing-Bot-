# Contributing to Ilom WhatsApp Bot

First off, thank you for considering contributing to Ilom WhatsApp Bot! 🎉 

It's people like you that make this bot amazing and help the WhatsApp bot community grow.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)
- [Feature Requests](#feature-requests)
- [Community](#community)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

### Our Standards

- **Be respectful**: Treat everyone with respect and kindness
- **Be inclusive**: Welcome newcomers and help them learn
- **Be constructive**: Provide helpful feedback and suggestions
- **Be patient**: Remember that everyone is learning
- **Be collaborative**: Work together towards common goals

## 🚀 Getting Started

### Prerequisites

- Node.js >= 16.0.0
- MongoDB (local or cloud)
- FFmpeg (for media processing)
- Git

### Quick Setup

1. **Fork the repository**
   ```bash
   # Click the "Fork" button on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/NexusCoders-cyber/Ilom-Whatsapp-Bot.git
   cd whatsapp-bot
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Start development**
   ```bash
   npm run dev
   ```

## 🛠️ How to Contribute

### Types of Contributions

We welcome all types of contributions:

- 🐛 **Bug fixes**
- ✨ **New features**
- 📚 **Documentation improvements**
- 🎨 **UI/UX enhancements**
- 🔧 **Code refactoring**
- ⚡ **Performance improvements**
- 🧪 **Tests**
- 🌐 **Translations**

### Contribution Areas

#### 1. Commands
Add new commands in `src/commands/[category]/`:

```javascript
module.exports = {
  name: 'yourcommand',
  aliases: ['alias'],
  category: 'general',
  description: 'Your command description',
  
  async execute({ sock, message, args, user, from }) {
    // Your command logic
  }
};
```

#### 2. Plugins
Create plugins in `src/plugins/`:

```javascript
module.exports = {
  name: 'yourPlugin',
  version: '1.0.0',
  description: 'Your plugin description',
  
  async execute(sock, message, context) {
    // Plugin logic
  }
};
```

#### 3. Services
Add services in `src/services/`:

```javascript
class YourService {
  async yourMethod() {
    // Service logic
  }
}

module.exports = new YourService();
```

#### 4. Utilities
Add utilities in `src/utils/`:

```javascript
class YourUtility {
  // Utility methods
}

module.exports = new YourUtility();
```

## 🔧 Development Setup

### Environment Setup

1. **Database Setup**
   ```bash
   # MongoDB (local)
   mongod --dbpath ./data

   # Or use MongoDB Atlas (cloud)
   # Add connection string to .env
   ```

2. **Redis (Optional)**
   ```bash
   # Install Redis
   redis-server

   # Add to .env
   REDIS_ENABLED=true
   REDIS_URL=redis://localhost:6379
   ```

3. **API Keys**
   ```bash
   # Add to .env
   OPENAI_API_KEY=your_key
   GEMINI_API_KEY=your_key
   # ... other API keys
   ```

### Development Commands

```bash
# Development mode with hot reload
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format

# Build for production
npm run build
```

## 📏 Coding Standards

### Code Style

- Use **ESLint** and **Prettier** for consistent formatting
- Follow **camelCase** for variables and functions
- Use **PascalCase** for classes
- Use **UPPER_SNAKE_CASE** for constants

### Best Practices

#### 1. Error Handling
```javascript
try {
  // Risky operation
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error('Operation failed:', error);
  throw new Error('User-friendly error message');
}
```

#### 2. Logging
```javascript
const logger = require('../utils/logger');

// Use appropriate log levels
logger.info('Operation completed successfully');
logger.warn('Warning: Something might be wrong');
logger.error('Error occurred:', error);
logger.debug('Debug information for development');
```

#### 3. Configuration
```javascript
const config = require('../config');

// Always use config for settings
const timeout = config.api.timeout || 5000;
```

#### 4. Async/Await
```javascript
// Preferred: async/await
async function fetchData() {
  try {
    const data = await apiCall();
    return data;
  } catch (error) {
    throw error;
  }
}

// Avoid: Promises with .then()
```

#### 5. Input Validation
```javascript
function validateInput(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid input: must be a non-empty string');
  }
  
  if (input.length > 1000) {
    throw new Error('Input too long: maximum 1000 characters');
  }
  
  return input.trim();
}
```

### Testing

Write tests for your contributions:

```javascript
// tests/unit/yourfeature.test.js
const { yourFunction } = require('../../src/utils/yourUtility');

describe('Your Feature', () => {
  test('should work correctly', () => {
    const result = yourFunction('test input');
    expect(result).toBe('expected output');
  });

  test('should handle errors', () => {
    expect(() => yourFunction(null)).toThrow('Invalid input');
  });
});
```

## 📝 Submitting Changes

### Pull Request Process

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**
   - Write clean, readable code
   - Add tests for new features
   - Update documentation
   - Follow coding standards

3. **Test your changes**
   ```bash
   npm test
   npm run lint
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add awesome new feature"
   # or
   git commit -m "fix: resolve bug with command handling"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create Pull Request**
   - Go to GitHub and create a PR
   - Use the PR template
   - Provide clear description
   - Link related issues

### Commit Message Format

Use conventional commit messages:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Maintenance tasks

**Examples:**
```
feat(commands): add weather command with location support

fix(media): resolve sticker creation memory leak

docs(readme): update installation instructions

style(handlers): improve code formatting and consistency

refactor(cache): optimize cache performance and memory usage

test(commands): add comprehensive tests for admin commands

chore(deps): update dependencies to latest versions
```

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature  
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

## 🐛 Reporting Issues

### Before Reporting

1. **Search existing issues** to avoid duplicates
2. **Update to latest version** to see if issue persists
3. **Check documentation** for known issues/solutions

### Issue Template

```markdown
**Bug Description**
Clear description of the bug

**Steps to Reproduce**
1. Step one
2. Step two
3. See error

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- OS: [e.g., Ubuntu 20.04]
- Node.js: [e.g., 18.17.0]
- Bot Version: [e.g., 1.0.0]

**Additional Context**
Screenshots, logs, etc.
```

## 💡 Feature Requests

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
Description of the problem

**Describe the solution you'd like**
Clear description of desired feature

**Describe alternatives considered**
Alternative solutions or features

**Use Cases**
How would this feature be used?

**Additional Context**
Mockups, examples, etc.
```

## 🏗️ Project Structure

Understanding the project structure helps with contributions:

```
src/
├── commands/          # Bot commands by category
├── handlers/          # Event and message handlers  
├── models/           # Database models
├── plugins/          # Plugin system
├── services/         # External service integrations
├── utils/           # Utility functions
├── api/            # REST API routes
├── middleware/     # Express middleware
├── events/         # Event handlers
├── locales/       # Language files
└── assets/        # Static assets
```

## 🧪 Testing Guidelines

### Test Categories

1. **Unit Tests** - Test individual functions
2. **Integration Tests** - Test component interactions
3. **E2E Tests** - Test complete workflows

### Writing Tests

```javascript
// Good test example
describe('Command Handler', () => {
  beforeEach(() => {
    // Setup test environment
  });

  test('should execute command successfully', async () => {
    const mockMessage = { /* mock data */ };
    const result = await commandHandler.execute(mockMessage);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  afterEach(() => {
    // Cleanup
  });
});
```

## 📚 Documentation

### Documentation Standards

- **Clear and concise** language
- **Code examples** for complex features  
- **Screenshots** for UI changes
- **API documentation** for new endpoints
- **Update README** for major changes

### Documentation Locations

- `README.md` - Main project documentation
- `docs/` - Detailed documentation
- Code comments - Inline documentation
- JSDoc - Function/class documentation

## 🌍 Internationalization

Help translate the bot to more languages:

1. **Add language files** in `src/locales/`
2. **Follow existing format** from `en.json`
3. **Test translations** thoroughly
4. **Update language list** in config

## 🤝 Community

### Getting Help

- **GitHub Discussions** - Ask questions and share ideas
- **Discord Server** - Real-time chat and support
- **GitHub Issues** - Bug reports and feature requests
- **Email** - contact@ilom.tech for private matters

### Code Review

All contributions go through code review:

- **Be open to feedback** - It helps improve the project
- **Respond promptly** to review comments
- **Make requested changes** or explain why not
- **Help review others'** contributions

### Recognition

Contributors are recognized in:

- **Contributors section** in README
- **Release notes** for significant contributions
- **Hall of Fame** for outstanding contributors

## 🏆 Contribution Rewards

We appreciate all contributions and offer:

- **Contributor badge** on your GitHub profile
- **Mention in release notes** for significant contributions
- **Priority support** for active contributors
- **Early access** to new features
- **Collaboration opportunities** on future projects

## 📄 License

By contributing to Ilom WhatsApp Bot, you agree that your contributions will be licensed under the MIT License.

## 🎉 Thank You!

Every contribution, no matter how small, makes a difference! Thank you for helping make Ilom WhatsApp Bot better for everyone.

---

**Happy Coding! 🚀**

*Questions? Feel free to reach out to the maintainers or community.*

