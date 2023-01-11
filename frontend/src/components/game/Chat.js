import React, {useEffect, useState} from "react";

const Chat = (props) => {
  const [message, setMessage] = useState("");
  const playerID = localStorage.getItem("playerID");

  useEffect(() => {
    const element = document.getElementById('chatForm');
    element.scrollTop = element.scrollHeight;
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    props.eventsCenter.emit("chat", {
      origin: {
        name: playerID,
        // TODO - this might cause us trouble. Maybe
        // store and get this from local storage?
        player: null,
      },
      text: message,
      game: null,
    })
    setMessage("");
  };

  const SERVER_MESSAGE_COLOUR = "darkgray";
  const THIS_PLAYER_MESSAGE_COLOUR = "pink";
  const OTHER_PLAYER_MESSAGE_COLOUR = "lightblue";
  const WARNING_MESSAGE_COLOUR = "orange";

  const getMessageColour = (message) => {
    if (message.origin.name === "Server") {
      return SERVER_MESSAGE_COLOUR;
    } else if (message.origin.name === playerID) {
      return THIS_PLAYER_MESSAGE_COLOUR;
    } else if (message.origin.name === "Warning") {
      return WARNING_MESSAGE_COLOUR;
    } else {
      return OTHER_PLAYER_MESSAGE_COLOUR;
    }
  }

  return (
    <div id={"chatContainer"} style={{maxHeight: "100%"}}>
      <form
        id={"chatForm"}
        onSubmit={handleSubmit}
        autoComplete={"off"}
        style={{
          color: "blue",
          margin: "10px",
          maxHeight: window.innerHeight / 100 * 80,  // 80% of window height
          overflowY: "auto",
        }}
      >
        <ul>
        {(props.messages.length > 0) ? (
          props.messages.map((message, counter) => (
            <li key={counter} style={{color: getMessageColour(message)}}>
              {message.origin.name.replace(playerID, "You")}: {message.text.replace(playerID, "You")}
            </li>
          ))
        ) : (
          <p>... connecting ...</p>
        ) }
        </ul>
        <div
          style={{
            bottom: "5px",
            position: "absolute",
          }}
        >
          <input
            type="text"
            name="chat_message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <input
            style={{cursor: "pointer", marginLeft: "5px"}}
            type="submit"
            value="Submit"
            onSubmit={handleSubmit}
          />
        </div>
      </form>
    </div>
  )
}

export default Chat;
