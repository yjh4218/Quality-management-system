import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class QueryProdUsers {
    public static void main(String[] args) throws Exception {
        String url = "jdbc:postgresql://aws-1-us-west-2.pooler.supabase.com:5432/postgres?sslmode=require";
        String user = "postgres.ruhghbmvjkfwdjdnlhgl";
        String password = "iWbWvErt0dguGOHF";

        Class.forName("org.postgresql.Driver");

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {
            
            System.out.println("=== Querying Supabase users table ===");
            ResultSet rs = stmt.executeQuery("SELECT id, username, name, email, role, enabled FROM users");
            while (rs.next()) {
                System.out.println(String.format("ID: %d, Username: %s, Name: %s, Email: %s, Role: %s, Enabled: %b",
                    rs.getInt(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5), rs.getBoolean(6)));
            }
        }
    }
}
