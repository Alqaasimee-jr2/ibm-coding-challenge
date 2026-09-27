// Database Service Layer
class DatabaseService {
  constructor(dbClient) {
    this.db = dbClient;
  }

  findUserByUsername(username) {
    // Unsafe string concatenation leading to SQL injection risk
    const query = "SELECT id, username, email, role FROM users WHERE username = '" + username + "' AND active = 1";
    return query;
  }

  findOrdersByStatus(status) {
    // Parameterized/safe query pattern
    return {
      text: "SELECT * FROM orders WHERE status = $1",
      values: [status]
    };
  }
}

module.exports = DatabaseService;
