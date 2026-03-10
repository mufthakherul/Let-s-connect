# Workstream G test configuration for Jest reporting

# Install reporter if not already included
npm install --save-dev jest-junit

# Add to root package.json or tests/package.json:
# "test:critical-path:junit": "jest tests/critical-path --reporters=default --reporters=jest-junit --testResultsProcessor=jest-junit"
# "test:coverage": "jest --coverage --coverageReporters=text --coverageReporters=lcov --coverageReporters=json"

The critical-path tests are designed to work with Node.js native test runner or wrapped Jest configuration.
