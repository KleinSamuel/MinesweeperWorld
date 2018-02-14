package api;

import model.ClusterFactory;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;
import util.Utils;

import javax.annotation.PostConstruct;
import java.util.Map;

@RestController
@RequestMapping("/data")
@EnableAutoConfiguration
@SpringBootApplication
public class MainRestPoint {

    private ClusterFactory clusterFactory;

    @Autowired
    private SocketHandler socketHandler;

    @PostConstruct
    public void init(){
        clusterFactory = new ClusterFactory();
        socketHandler.setClusterFactory(clusterFactory);
    }

    @RequestMapping(value = "/requestCluster", method = RequestMethod.POST)
    @ResponseBody
    public String requestCluster(@RequestBody Map<String, Object> body){
        int startX = (Integer)body.get("startX");
        int startY = (Integer)body.get("startY");
        Document doc = clusterFactory.getCluster(startX, startY);
        return doc.toJson();
    }

    @RequestMapping(value = "/login", method = RequestMethod.POST)
    @ResponseBody
    public String loginUser(@RequestBody Map<String, Object> body){

        String username = String.valueOf(body.get("username"));
        String password = String.valueOf(body.get("password"));
        Document response = new Document();
        String uid;

        if(username.equals("2bf9efa0")){
            uid = Utils.getUniqueID();
            response.append("id", uid);
        }else{
            Document userdata = clusterFactory.dbHandler.getUserdata(username, password);
            if(userdata == null){
                response.append("id", null);
            }else{
                response.append("id", userdata.getString("id"));
                response.append("username", userdata.getString("username"));
                response.append("cellsCleared", userdata.getDouble("cellsCleared").intValue());
                response.append("bombsDefused", userdata.getDouble("bombsDefused").intValue());
                response.append("bombsActivated", userdata.getDouble("bombsActivated").intValue());
                response.append("score", userdata.getDouble("score").intValue());
            }
        }
        return response.toJson();
    }

    @RequestMapping(value = "/getStats", method = RequestMethod.POST)
    @ResponseBody
    public String getStats(@RequestBody Map<String, Object> body){

        String uid = String.valueOf(body.get("id"));
        Document response = new Document();

        Document userdata = clusterFactory.dbHandler.getUserdata(uid);
        response.append("id", userdata.getString("id"));
        response.append("username", userdata.getString("username"));
        response.append("cellsCleared", userdata.getDouble("cellsCleared").intValue());
        response.append("bombsDefused", userdata.getDouble("bombsDefused").intValue());
        response.append("bombsActivated", userdata.getDouble("bombsActivated").intValue());
        response.append("score", userdata.getDouble("score").intValue());

        return response.toJson();
    }

    /*@RequestMapping(value = "/setClick", method = RequestMethod.POST)
    @ResponseBody
    public int setClick(@RequestBody Map<String, Object> body){
        int x = (Integer)body.get("x");
        int y = (Integer)body.get("y");

        HashMap<String, Integer> toClick = clusterFactory.setClick(x, y);

        return 1;
    }

    @RequestMapping(value = "/setFlag", method = RequestMethod.POST)
    @ResponseBody
    public int setFlag(@RequestBody Map<String, Object> body){
        int x = (Integer)body.get("x");
        int y = (Integer)body.get("y");
        int flagPossible = clusterFactory.setFlag(x, y);
        return flagPossible;
    }*/

    public static void main(String[] args) throws Exception {
        SpringApplication.run(MainRestPoint.class, args);
    }

}
