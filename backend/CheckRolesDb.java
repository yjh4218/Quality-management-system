import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class CheckRolesDb {
    public static void main(String[] args) {
        String jdbcUrl = "jdbc:h2:file:./data/qmsdb;AUTO_SERVER=TRUE";
        String username = "sa";
        String password = "";

        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password)) {
            Statement stmt = conn.createStatement();
            ResultSet rs = stmt.executeQuery("SELECT role_key, allowed_menus FROM roles");
            while (rs.next()) {
                System.out.println("Role: " + rs.getString("role_key"));
                String menus = rs.getString("allowed_menus");
                System.out.println("Menus: " + (menus == null ? "NULL" : "'" + menus + "'"));
                System.out.println("-----------------");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
