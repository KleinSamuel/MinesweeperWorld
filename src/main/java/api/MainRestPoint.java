package api;

import database.DatabaseHandler;
import model.ClusterFactory;
import org.bson.Document;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;

import javax.annotation.PostConstruct;
import java.util.Map;

@RestController
@RequestMapping("/data")
@EnableAutoConfiguration
@SpringBootApplication
public class MainRestPoint {

    private ClusterFactory clusterFactory;

    @PostConstruct
    public void init(){
        clusterFactory = new ClusterFactory();
    }

    @RequestMapping(value = "/requestCluster", method = RequestMethod.POST)
    @ResponseBody
    public String requestCluster(@RequestBody Map<String, Object> body){
        int startX = (Integer)body.get("startX");
        int startY = (Integer)body.get("startY");
        Document doc = clusterFactory.getCluster(startX, startY);
        return doc.toJson();
    }

    @RequestMapping(value = "/setClick", method = RequestMethod.POST)
    @ResponseBody
    public int setClick(@RequestBody Map<String, Object> body){
        int x = (Integer)body.get("x");
        int y = (Integer)body.get("y");
        int value = clusterFactory.setClick(x, y);
        return value;
    }

    @RequestMapping(value = "/setFlag", method = RequestMethod.POST)
    @ResponseBody
    public int setFlag(@RequestBody Map<String, Object> body){
        int x = (Integer)body.get("x");
        int y = (Integer)body.get("y");
        int flagPossible = clusterFactory.setFlag(x, y);
        return flagPossible;
    }

    public static void main(String[] args) throws Exception {
        SpringApplication.run(MainRestPoint.class, args);
    }

}
