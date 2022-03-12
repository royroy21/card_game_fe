import { Link } from "react-router-dom";
import './App.css';

function App() {
  return (
    <div className={"page"}>
      <h1>Ketamine.</h1>
      <ul>
        <li>
          <Link
            className={"btn"}
            to="/game"
            onClick={() => localStorage.clear()}
          >
            Create Game
          </Link>
        </li>
        <li>
          <Link className={"btn"} to="/join-game">
            Join Game
          </Link>
        </li>
      </ul>
    </div>
  );
}

export default App;
