package database;

import com.mongodb.BasicDBObject;
import com.mongodb.MongoClient;
import com.mongodb.MongoClientURI;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import model.ClusterFactory;
import org.bson.Document;
import org.springframework.stereotype.Component;
import util.Utils;

import javax.print.Doc;

@Component
public class DatabaseHandler {

    MongoClient client;
    MongoDatabase minesweeperDatabase;
    MongoCollection<Document> collection;
    MongoCollection<Document> userdata;

    public DatabaseHandler(){
        MongoClientURI connectionString = new MongoClientURI("mongodb://localhost:27017");
        this.client = new MongoClient(connectionString);
        this.minesweeperDatabase = client.getDatabase("minesweeperworld");
        collection = minesweeperDatabase.getCollection("data");
        userdata = minesweeperDatabase.getCollection("userdata");
    }

    public Document getCluster(int startX, int startY){
        BasicDBObject query = new BasicDBObject();
        query.append("startX", startX);
        query.append("startY", startY);
        return collection.find(query).first();
    }

    public boolean clusterExists(int startX, int startY){
        BasicDBObject query = new BasicDBObject();
        query.append("startX", startX);
        query.append("startY", startY);
        Document doc = collection.find(query).first();
        return (doc != null);
    }

    public void insertCluster(Document cluster){
        collection.insertOne(cluster);
    }

    public void updateCellInCluster(int startX, int startY, String key, int value){
        BasicDBObject updatedCell = new BasicDBObject();
        updatedCell.append("cells."+key, value);
        BasicDBObject newDoc = new BasicDBObject();
        newDoc.append("$set", updatedCell);
        BasicDBObject query = new BasicDBObject();
        query.append("startX", startX);
        query.append("startY", startY);
        collection.updateOne(query, newDoc);
    }

    /**
     * Update a value in the display cells
     * Used when a player clicks on a unknown cell
     *
     * @param startX
     * @param startY
     * @param key
     * @param value
     */
    public void updateCellInDisplay(int startX, int startY, String key, int value){
        BasicDBObject updatedCell = new BasicDBObject();
        updatedCell.append("display."+key, value);
        BasicDBObject newDoc = new BasicDBObject();
        newDoc.append("$set", updatedCell);
        BasicDBObject query = new BasicDBObject();
        query.append("startX", startX);
        query.append("startY", startY);
        collection.updateOne(query, newDoc);
    }

    public void updateDone(int startX, int startY, boolean done){
        BasicDBObject updatedDone = new BasicDBObject();
        updatedDone.append("done", done);
        BasicDBObject newDoc = new BasicDBObject();
        newDoc.append("$set", updatedDone);
        BasicDBObject query = new BasicDBObject();
        query.append("startX", startX);
        query.append("startY", startY);
        collection.updateOne(query, newDoc);
    }

    public Document getUserdata(String username, String password){
        BasicDBObject query = new BasicDBObject();
        query.append("username", username);
        query.append("password", password);
        return userdata.find(query).first();
    }

    public String saveUserdata(String username, String password){
        Document toInsert = new Document();
        toInsert.append("username", username);
        toInsert.append("password", password);
        String uid = Utils.getUniqueID();
        toInsert.append("id", uid);
        userdata.insertOne(toInsert);
        return uid;
    }

}
