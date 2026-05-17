import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class TestQuery {
    public static void main(String[] args) throws Exception {
        String url = "jdbc:h2:file:./data/qmsdb;DB_CLOSE_DELAY=-1;AUTO_SERVER=TRUE;MODE=PostgreSQL";
        String user = "sa";
        String password = "";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {
            
            ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM regulatory_ingredient");
            if (rs.next()) {
                System.out.println("Total ingredients in DB: " + rs.getInt(1));
            }
        }
    }
}
