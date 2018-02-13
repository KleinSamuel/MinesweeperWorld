package api.schemas;

public class UserdataBody {

    private String id;

    public UserdataBody(){}

    public UserdataBody(String id) {
        this.id = id;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }
}
