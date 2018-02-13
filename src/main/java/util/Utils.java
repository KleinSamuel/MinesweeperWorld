package util;

import javafx.util.Pair;

public class Utils {

    public static Pair<Integer, Integer> getClusterForCoordinates(int x, int y){
        int facX = x/100;
        if(x < 0){
            facX -= 1;
        }
        int startX = 100*facX;
        int facY = y/100;
        if(y < 0){
            facY -= 1;
        }
        int startY = 100*facY;
        return new Pair<Integer, Integer>(startX, startY);
    }

    public static String getKeyString(int x, int y){
        return x+"_"+y;
    }

    public static Pair<Integer, Integer> decodeKeyString(String keyString){
        String[] tmpArr = keyString.split("_");
        int x = Integer.parseInt(tmpArr[0]);
        int y = Integer.parseInt(tmpArr[1]);
        return new Pair<Integer, Integer>(x, y);
    }

}
