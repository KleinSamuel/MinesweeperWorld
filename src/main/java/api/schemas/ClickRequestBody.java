package api.schemas;

public class ClickRequestBody {

    private int x;
    private int y;
    private String id;

    public ClickRequestBody(){

    }

    public ClickRequestBody(int x, int y, String id) {
        this.x = x;
        this.y = y;
        this.id = id;
    }

    public int getX() {
        return x;
    }

    public void setX(int x) {
        this.x = x;
    }

    public int getY() {
        return y;
    }

    public void setY(int y) {
        this.y = y;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }
}
