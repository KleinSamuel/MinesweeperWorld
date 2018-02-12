package model;

import database.DatabaseHandler;
import javafx.util.Pair;
import org.bson.BsonArray;
import org.bson.Document;
import util.Utils;

import javax.print.Doc;
import java.util.Random;

public class ClusterFactory {

    private Random random;
    private DatabaseHandler dbHandler;

    private float bombFrequency = 0.2f;

    public ClusterFactory(){
        random = new Random();
        this.dbHandler = new DatabaseHandler();
    }

    public Document getCluster(int startX, int startY){

        System.out.println("[ REQUEST ] Get Cluster ("+startX+":"+startY+")");

        Document cluster = dbHandler.getCluster(startX, startY);

        /* if cluster is not in database, create a new one and store it */
        if(cluster == null){
            cluster = createCluster(startX, startY);
            dbHandler.insertCluster(cluster);
        }

        /* if cluster is not calculated yet, create adjacent and calculate */
        if(!cluster.getBoolean("done")){
            createAdjacentCluster(startX, startY);
            calculateBombIndices(startX, startY);
            cluster = dbHandler.getCluster(startX, startY);
        }

        return cluster;
    }

    public int setClick(int x, int y){

        Pair<Integer, Integer> pair = Utils.getClusterForCoordinates(x, y);
        int startX = pair.getKey();
        int startY = pair.getValue();
        String keyString = Utils.getKeyString(x, y);

        Document cluster = dbHandler.getCluster(startX, startY);
        Document cells = (Document)cluster.get("cells");
        Document display = (Document)cluster.get("display");

        int valueInDisplay = display.getInteger(keyString);

        /* check if cell is possible to click */
        if(valueInDisplay == 0){
            int value = cells.getInteger(keyString);

            /* set value of cell in display set */
            dbHandler.updateCellInDisplay(startX, startY, keyString, value);

            return value;
        }else{
            return -1;
        }
    }

    /**
     * Set a flag at cell.
     * Return -1 if there is no flag possible
     * Return 1 if flag is set
     * Return 0 if flag is unset
     *
     * @param x
     * @param y
     * @return
     */
    public int setFlag(int x, int y){
        Pair<Integer, Integer> pair = Utils.getClusterForCoordinates(x, y);
        int startX = pair.getKey();
        int startY = pair.getValue();
        String keyString = Utils.getKeyString(x, y);

        Document cluster = dbHandler.getCluster(startX, startY);
        Document cells = (Document)cluster.get("cells");
        Document display = (Document)cluster.get("display");

        int value = cells.getInteger(keyString);
        int displayValue = display.getInteger(keyString);

        /* if there is a bomb, set flag */
        if(value == 11){
            /* if there is a flag already, unset flag */
            if(displayValue == 10){
                dbHandler.updateCellInDisplay(startX, startY, keyString, 0);
                return 0;
            }else {
                dbHandler.updateCellInDisplay(startX, startY, keyString, 10);
                return 1;
            }
        }
        /* if there is no bomb, return error code */
        else{
            return -1;
        }
    }

    public Document createCluster(int startX, int startY){

        System.out.println("[ DB ] Create cluster ("+startX+":"+startY+")");

        Document doc = new Document();
        Document cells = new Document();
        Document display = new Document();
        for(int x = 0; x <= 99; x++){
            for(int y = 0; y <= 99; y++){
                int currentX = startX+x;
                int currentY = startY+y;
                String key = currentX+"_"+currentY;
                cells.append(key, (isBomb()) ? 11 : 9);
                display.append(key, 0);
            }
        }
        doc.append("startX", startX);
        doc.append("startY", startY);
        doc.append("endX", startX+99);
        doc.append("endY", startY+99);
        doc.append("done", false);
        doc.append("cells", cells);
        doc.append("display", display);
        return doc;
    }

    public void createAdjacentCluster(int startX, int startY){

        /* if left cluster does not exist */
        if(!dbHandler.clusterExists(startX-100, startY)){
            Document cluster = createCluster(startX-100, startY);
            dbHandler.insertCluster(cluster);
        }
        /* if right cluster does not exist */
        if(!dbHandler.clusterExists(startX+100, startY)){
            Document cluster = createCluster(startX+100, startY);
            dbHandler.insertCluster(cluster);
        }
        /* if up cluster does not exist */
        if(!dbHandler.clusterExists(startX, startY-100)){
            Document cluster = createCluster(startX, startY-100);
            dbHandler.insertCluster(cluster);
        }
        /* if down cluster does not exist */
        if(!dbHandler.clusterExists(startX, startY+100)){
            Document cluster = createCluster(startX, startY+100);
            dbHandler.insertCluster(cluster);
        }
        /* if left up cluster does not exist */
        if(!dbHandler.clusterExists(startX-100, startY-100)){
            Document cluster = createCluster(startX-100, startY-100);
            dbHandler.insertCluster(cluster);
        }
        /* if right up cluster does not exist */
        if(!dbHandler.clusterExists(startX+100, startY-100)){
            Document cluster = createCluster(startX+100, startY-100);
            dbHandler.insertCluster(cluster);
        }
        /* if left down cluster does not exist */
        if(!dbHandler.clusterExists(startX-100, startY+100)){
            Document cluster = createCluster(startX-100, startY+100);
            dbHandler.insertCluster(cluster);
        }
        /* if right down cluster does not exist */
        if(!dbHandler.clusterExists(startX+100, startY+100)){
            Document cluster = createCluster(startX+100, startY+100);
            dbHandler.insertCluster(cluster);
        }
    }

    public void calculateBombIndices(int startX, int startY){

        Document cluster = dbHandler.getCluster(startX, startY);

        Document leftCluster = dbHandler.getCluster(startX-100, startY);
        Document rightCluster = dbHandler.getCluster(startX+100, startY);
        Document upCluster = dbHandler.getCluster(startX, startY-100);
        Document downCluster = dbHandler.getCluster(startX, startY+100);

        Document leftUpCluster = dbHandler.getCluster(startX-100, startY-100);
        Document rightUpCluster = dbHandler.getCluster(startX+100, startY-100);
        Document leftDownCluster = dbHandler.getCluster(startX-100, startY+100);
        Document rightDownCluster = dbHandler.getCluster(startX+100, startY+100);

        for(int x = startX; x <= startX+99; x++){
            for(int y = startY; y <= startY+99; y++){

                String key = x+"_"+y;

                if(((Document)cluster.get("cells")).getInteger(key) == 11){
                    continue;
                }

                int count = 0;

                /* check if left cell is in current or left cluster */
                int leftX = x-1;
                int leftY = y;
                String leftKey = leftX+"_"+leftY;
                Document leftCells;
                int leftValue;
                if(leftX < startX){
                    leftCells = (Document)leftCluster.get("cells");
                }else{
                    leftCells = (Document)cluster.get("cells");
                }
                leftValue = leftCells.getInteger(leftKey);
                count += (leftValue == 11) ? 1 : 0;

                /* check if right cell is in current or right cluster */
                int rightX = x+1;
                int rightY = y;
                String rightKey = rightX+"_"+rightY;
                Document rightCells;
                int rightValue;
                if(rightX > startX+99){
                    rightCells = (Document)rightCluster.get("cells");
                }else{
                    rightCells = (Document)cluster.get("cells");
                }
                rightValue = rightCells.getInteger(rightKey);
                count += (rightValue == 11) ? 1 : 0;

                /* check if up cell is in current or up cluster */
                int upX = x;
                int upY = y-1;
                String upKey = upX+"_"+upY;
                Document upCells;
                int upValue;
                if(upY < startY){
                    upCells = (Document)upCluster.get("cells");
                }else{
                    upCells = (Document)cluster.get("cells");
                }
                upValue = upCells.getInteger(upKey);
                count += (upValue == 11) ? 1 : 0;

                /* check if down cell is in current or down cluster */
                int downX = x;
                int downY = y+1;
                String downKey = downX+"_"+downY;
                Document downCells;
                int downValue;
                if(downY > startY+99){
                    downCells = (Document)downCluster.get("cells");
                }else{
                    downCells = (Document)cluster.get("cells");
                }
                downValue = downCells.getInteger(downKey);
                count += (downValue == 11) ? 1 : 0;

                /* check if left up cell is in current or left or up or left up cluster */
                int leftUpX = x-1;
                int leftUpY = y-1;
                String leftUpKey = leftUpX+"_"+leftUpY;
                Document leftUpCells;
                int leftUpValue;

                if(leftUpX < startX){
                    if(leftUpY < startY){
                        leftUpCells = (Document)leftUpCluster.get("cells");
                    }else{
                        leftUpCells = (Document)leftCluster.get("cells");
                    }
                }else{
                    if(leftUpY < startY){
                        leftUpCells = (Document)upCluster.get("cells");
                    }else{
                        leftUpCells = (Document)cluster.get("cells");
                    }
                }
                leftUpValue = leftUpCells.getInteger(leftUpKey);
                count += (leftUpValue == 11) ? 1 : 0;

                /* check if right up cell is in current or right or up or right up cluster */
                int rightUpX = x+1;
                int rightUpY = y-1;
                String rightUpKey = rightUpX+"_"+rightUpY;
                Document rightUpCells;
                int rightUpValue;

                if(rightUpX > startX+99){
                    if(rightUpY < startY){
                        rightUpCells = (Document)rightUpCluster.get("cells");
                    }else{
                        rightUpCells = (Document)rightCluster.get("cells");
                    }
                }else{
                    if(rightUpY < startY){
                        rightUpCells = (Document)upCluster.get("cells");
                    }else{
                        rightUpCells = (Document)cluster.get("cells");
                    }
                }
                rightUpValue = rightUpCells.getInteger(rightUpKey);
                count += (rightUpValue == 11) ? 1 : 0;

                /* check if left down cell is in current or left or down or left down cluster */
                int leftDownX = x-1;
                int leftDownY = y+1;
                String leftDownKey = leftDownX+"_"+leftDownY;
                Document leftDownCells;
                int leftDownValue;

                if(leftDownX < startX){
                    if(leftDownY > startY+99){
                        leftDownCells = (Document)leftDownCluster.get("cells");
                    }else{
                        leftDownCells = (Document)leftCluster.get("cells");
                    }
                }else{
                    if(leftDownY > startY+99){
                        leftDownCells = (Document)downCluster.get("cells");
                    }else{
                        leftDownCells = (Document)cluster.get("cells");
                    }
                }
                leftDownValue = leftDownCells.getInteger(leftDownKey);
                count += (leftDownValue == 11) ? 1 : 0;

                /* check if right down cell is in current or right or down or right down cluster */
                int rightDownX = x+1;
                int rightDownY = y+1;
                String rightDownKey = rightDownX+"_"+rightDownY;
                Document rightDownCells;
                int rightDownValue;

                if(rightDownX > startX+99){
                    if(rightDownY > startY+99){
                        rightDownCells = (Document)rightDownCluster.get("cells");
                    }else{
                        rightDownCells = (Document)rightCluster.get("cells");
                    }
                }else{
                    if(rightDownY > startY+99){
                        rightDownCells = (Document)downCluster.get("cells");
                    }else{
                        rightDownCells = (Document)cluster.get("cells");
                    }
                }
                rightDownValue = rightDownCells.getInteger(rightDownKey);
                count += (rightDownValue == 11) ? 1 : 0;

                if(count == 0){
                    count = 9;
                }

                /* update cell in database */
                dbHandler.updateCellInCluster(startX, startY, key, count);

            }
        }

        dbHandler.updateDone(startX, startY, true);
    }

    public boolean isBomb(){
        return random.nextFloat() < bombFrequency;
    }

}
