# Example of what a message should look like
```python
{
	"type": "connecting",
	"message": {
      "type": "player_connected"
      "origin": {
          "name": "",  # playerID / name
          "player" "",  # player1 or player2
          "canvas": {
              width: this.width,
              height: this.height,
          },
      },
      "text": "",
      "data": {} or [],
      "game": {
          "gameID": "",
          "player1": {
              "name": "",
              "deck": [],
              "hand": [],
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
