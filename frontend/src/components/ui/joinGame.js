import React, { useState, useEffect } from 'react';
import {BASE_BACKEND_GAME_API_URL} from "../../settings";
import {Link} from "react-router-dom";

const JoinGame = () => {
  const [availableGames, setAvailableGames] = useState([]);
  const [filteredAvailableGames, SetFilteredAvailableGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailableGames();
  }, []);

  const availableGamesURL = BASE_BACKEND_GAME_API_URL + "available-games/"
  const fetchAvailableGames = () => {
    setLoading(true);
    fetch(availableGamesURL)
      .then(response => response.json())
      .then(data => {
        setAvailableGames(data.available_games);
        SetFilteredAvailableGames(data.available_games);
        setLoading(false);
      })
      .catch((error) => {
        console.log(error);
        setLoading(false);
      });
  };

  const filterGames = (text) => {
    SetFilteredAvailableGames(
      availableGames.filter(game => game.includes(text))
    )
  }

  // Player may wish to re-join game
  const joinedGame = localStorage.getItem("gameID");

  return (
    <div style={{height: "100%"}} className={"page"}>
      <h1>Join Game</h1>
      {loading? (
        <p>... data loading ...</p>
      ) : (
        <div
          style={{
            maxHeight: window.innerHeight / 100 * 60,  // 80% of window height
            overflowY: "auto",
            marginBottom: "10px",
          }}
        >
          <ul style={{
            padding: 0,
          }}>
            {filteredAvailableGames.map(game => {
              if (game !== joinedGame) {
                return (
                  <li
                    key={game}
                  >
                    <Link
                      key={game}
                      className={"btn"}
                      to="/game"
                      onClick={() => localStorage.setItem("gameID", game)}
                    >
                      {game}
                    </Link>
                  </li>
                )
              }
            })}
          </ul>
        </div>
      )}
      {availableGames.length > 10 ? (
        <form autoComplete={"off"}>
          <input
            placeholder={"Search games ..."}
            style={{width: "97%", marginBottom: "10px"}}
            type="text"
            name="search"
            onChange={(event) => filterGames(event.target.value)}
          />
        </form>
        ) : null  }
      {joinedGame ? (
        <Link
          className={"btn"}
          to="/game"
        >
          Rejoin game {joinedGame}
        </Link>
      ) : null}
      <div
        className={"btn"}
        onClick={fetchAvailableGames}
      >
        Refresh
      </div>
    </div>
  )
}

export default JoinGame;
