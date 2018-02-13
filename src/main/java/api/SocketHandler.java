package api;

import api.schemas.*;
import javafx.util.Pair;
import model.ClusterFactory;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.config.annotation.AbstractWebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import util.Utils;

import java.util.HashMap;
import java.util.Map;

@Controller
@Configuration
@EnableWebSocketMessageBroker
public class SocketHandler extends AbstractWebSocketMessageBrokerConfigurer{

    private ClusterFactory clusterFactory;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public void setClusterFactory(ClusterFactory clusterFactory){
        this.clusterFactory = clusterFactory;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/notifications");
        config.setApplicationDestinationPrefixes("/request");
    }

    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/minesweeperworld");
        registry.addEndpoint("/minesweeperworld").withSockJS();
    }

    @MessageMapping("/click")
    public void handleClickRequest(ClickRequestBody clickRequestBody) throws Exception {
        /* get all cells that need to be opened by this click */
        HashMap<String, Integer> toClick = clusterFactory.setClick(clickRequestBody.getX(), clickRequestBody.getY());
        if(toClick == null){
            return;
        }
        for(Map.Entry<String, Integer> entry : toClick.entrySet()){
            Pair<Integer, Integer> coords = Utils.decodeKeyString(entry.getKey());
            sendClickResponse(coords.getKey(), coords.getValue(), entry.getValue());
        }
    }

    /**
     * Send position and value of opened cell
     */
    public void sendClickResponse(int x, int y, int value){
        messagingTemplate.convertAndSend("/notifications/clickResponse", new ClickResponseBody(x, y, value));
    }

    public void sendMessageToUser(String id, String message){
        Document doc = new Document();
        doc.append("message", message);
        messagingTemplate.convertAndSend("/notifications/"+id+"/message", doc);
    }

    public void sendFlagFailedResponse(String id, int x, int y){
        messagingTemplate.convertAndSend("/notifications/"+id+"/failedFlag", new FlagResponseBody(x, y));
    }

    @MessageMapping("/flag")
    public void handleFlagRequest(FlagRequestBody flagRequestBody) throws Exception {
        int flagStatus = clusterFactory.setFlag(flagRequestBody.getX(), flagRequestBody.getY());
        if(flagStatus == 1){
            sendFlagResponse(flagRequestBody.getX(), flagRequestBody.getY());
        }else if(flagStatus == -1){
            sendFlagFailedResponse(flagRequestBody.getId(), flagRequestBody.getX(), flagRequestBody.getY());
        }
    }

    /* Send position of flagged cell */
    public void sendFlagResponse(int x, int y){
        messagingTemplate.convertAndSend("/notifications/flagResponse", new FlagResponseBody(x, y));
    }
}
