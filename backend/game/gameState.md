# Example of what a message should look like
```python
{
	"type": "connecting",
	"message": {
        "type": "player_connected",
        "origin": {
            "name": "", 
            "player": "",
            "canvas": {
                "width": "this.width",
                "height": "this.height",
            },
        },
        "text": "",
        "data": {} or [],
        "game": {
            "gameID": "",
            "playerTurn": "player1",  # determined by server if both players are present.
            "player1": {
                "name": "",
                "deck": [],
                "hand": [],
                "turn": 1,
                "drop_zones": {
                    "playerZone1": None,
                    "playerZone2": None,
                    "playerZone3": None,
                    "playerZone4": None,
                    "playerZone5": None,
                    "playerZone6": None,
              },
           },
          "player2": {
              "name": "",
              "deck": [],
              "hand": [],
              "turn": 1,
              "drop_zones": {
                  "playerZone1": None,
                  "playerZone2": None,
                  "playerZone3": None,
                  "playerZone4": None,
                  "playerZone5": None,
                  "playerZone6": None,
              },
          },
      },
	},
}
```
