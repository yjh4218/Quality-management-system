import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class QueryUsers {
    public static void main(String[] args) throws Exception {
        String url = "jdbc:h2:file:./data/qmsdb;DB_CLOSE_DELAY=-1;AUTO_SERVER=TRUE;MODE=PostgreSQL";
        String user = "sa";
        String password = "";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {
            
            System.out.println("=== Querying users table ===");
            ResultSet rs = stmt.executeQuery("SELECT id, username, name, email, role, company_name, department, enabled FROM users");
            while (rs.next()) {
                System.out.println(String.format("ID: %d, Username: %s, Name: %s, Email: %s, Role: %s, Company: %s, Dept: %s, Enabled: %b",
                    rs.getInt(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5), rs.getString(6), rs.getString(7), rs.getBoolean(8)));
            }

            System.out.println("\n=== Querying system_settings table ===");
            ResultSet rs2 = stmt.executeQuery("SELECT * FROM system_settings");
            while (rs2.next()) {
                System.out.println(String.format("Key: %s, Value: %s", rs2.getString("setting_key"), rs2.getString("setting_value")));
            }
        }
    }
}
