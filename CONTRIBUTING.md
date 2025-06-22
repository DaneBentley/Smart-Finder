# Contributing to Smart Finder

Thank you for your interest in contributing to Smart Finder! We welcome contributions from the community and are grateful for any help you can provide.

## 🤝 How to Contribute

### Reporting Issues
- **Check existing issues** first to avoid duplicates
- **Use issue templates** when available
- **Provide detailed information** including:
  - Chrome version
  - Operating system
  - Steps to reproduce
  - Expected vs actual behavior
  - Screenshots if applicable

### Suggesting Features
- **Search existing feature requests** before creating new ones
- **Describe the use case** and why it would be valuable
- **Consider the scope** - features should align with Smart Finder's core mission
- **Provide mockups or examples** if helpful

### Code Contributions

#### Getting Started
1. **Fork the repository**
2. **Clone your fork** locally
3. **Create a feature branch** from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Set up development environment** (see README.md)

#### Development Guidelines

##### Code Style
- **Follow existing patterns** in the codebase
- **Use meaningful variable names** and comments
- **Keep functions focused** and reasonably sized
- **Use modern JavaScript** (ES6+) features appropriately

##### Extension Development
- **Test on multiple websites** with different content types
- **Verify keyboard shortcuts** work correctly
- **Check performance** on large pages
- **Ensure accessibility** standards are met
- **Test in different Chrome versions** if possible

##### Backend Development
- **Follow RESTful API principles**
- **Include proper error handling**
- **Add input validation** for all endpoints
- **Update API documentation** if needed

#### Testing
- **Test your changes thoroughly** before submitting
- **Include test cases** for new functionality when possible
- **Verify backward compatibility** isn't broken
- **Test edge cases** and error scenarios

#### Submitting Changes
1. **Commit your changes** with clear, descriptive messages
   ```bash
   git commit -m "Add feature: description of what you added"
   ```
2. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
3. **Create a Pull Request** with:
   - Clear title and description
   - Reference to related issues
   - Screenshots/videos if UI changes
   - Testing steps performed

## 📋 Pull Request Guidelines

### Before Submitting
- [ ] Code follows existing style and patterns
- [ ] Changes are tested on multiple websites
- [ ] No console errors or warnings
- [ ] Documentation updated if needed
- [ ] Commit messages are clear and descriptive

### PR Description Should Include
- **What** changes were made
- **Why** the changes were necessary
- **How** to test the changes
- **Screenshots** for UI changes
- **Breaking changes** if any

## 🏗️ Development Setup

### Prerequisites
- Node.js 18+
- Chrome browser
- Git

### Local Development
```bash
# Clone your fork
git clone https://github.com/your-username/Smart-Finder.git
cd Smart-Finder

# Load extension in Chrome
# 1. Open chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select the smart-finder-extension/ folder

# For backend development (optional)
cd vercel-backend
npm install
# See docs/setup/SETUP_GUIDE.md for full backend setup
```

## 🎯 Areas for Contribution

### High Priority
- **Performance optimizations** for large pages
- **Accessibility improvements**
- **Cross-browser compatibility** (Edge, Firefox)
- **Mobile responsiveness** for popup interface

### Medium Priority
- **Additional pattern detection** types
- **UI/UX improvements**
- **Internationalization** (i18n)
- **Advanced search features**

### Documentation
- **User guides** and tutorials
- **API documentation** improvements
- **Code comments** and inline documentation
- **Video demos** or examples

## 🐛 Bug Reports

### Before Reporting
- **Update to latest version** and test again
- **Check known issues** in README or issues
- **Try incognito mode** to rule out other extensions

### Include in Bug Reports
- **Chrome version** (`chrome://version/`)
- **Extension version**
- **Operating system**
- **Website URL** where issue occurs (if public)
- **Exact steps** to reproduce
- **Console errors** (F12 → Console tab)
- **Screenshots or screen recordings**

## 🔒 Security

### Reporting Security Issues
- **Do NOT** create public issues for security vulnerabilities
- **Email directly** to the maintainers
- **Include detailed information** about the vulnerability
- **Allow time** for fix before public disclosure

### Security Best Practices
- **Never commit** API keys or secrets
- **Validate all inputs** in backend code
- **Use HTTPS** for all API communications
- **Follow Chrome extension** security guidelines

## 📝 Code Review Process

### What We Look For
- **Code quality** and maintainability
- **Performance impact** on extension
- **Security considerations**
- **User experience** improvements
- **Documentation completeness**

### Review Timeline
- **Initial response** within 48 hours
- **Full review** within 1 week
- **Follow-up** on requested changes
- **Merge** when approved and tests pass

## 🏷️ Versioning

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR** version for incompatible API changes
- **MINOR** version for backward-compatible functionality
- **PATCH** version for backward-compatible bug fixes

## 📄 License

By contributing to Smart Finder, you agree that your contributions will be licensed under the same MIT License that covers the project.

## 🙏 Recognition

Contributors are recognized in:
- **README.md** acknowledgments section
- **Release notes** for significant contributions
- **GitHub contributors** page

## 💬 Questions?

- **GitHub Discussions** for general questions
- **GitHub Issues** for bug reports and feature requests
- **Pull Request comments** for code-specific questions

Thank you for contributing to Smart Finder! 🚀 