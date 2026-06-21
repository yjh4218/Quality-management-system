import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class QueryClaim {
    public static void main(String[] args) throws Exception {
        String url = "jdbc:h2:file:./data/qmsdb;DB_CLOSE_DELAY=-1;AUTO_SERVER=TRUE;MODE=PostgreSQL";
        String user = "sa";
        String password = "";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {
            
            System.out.println("=== Querying claims table for ID 291 ===");
            ResultSet rs = stmt.executeQuery("SELECT id, claim_number, updated_at, version, shared_with_manufacturer FROM claims WHERE id = 291");
            if (rs.next()) {
                System.out.println(String.format("ID: %d, ClaimNumber: %s, UpdatedAt: %s, Version: %d, Shared: %b",
                    rs.getInt(1), rs.getString(2), rs.getString(3), rs.getInt(4), rs.getBoolean(5)));
            } else {
                System.out.println("Claim 291 not found!");
            }
        }
    }
}
