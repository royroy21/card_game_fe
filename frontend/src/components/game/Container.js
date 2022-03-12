import React from "react";
import Game from "./index";
import eventsCenter from "./EventsCenter";
import Chat from "./Chat";

class GameContainer extends React.Component {

  state = {
    messages: [],
  };

  componentDidMount() {
    this.eventsCenter = eventsCenter;
    this.eventsCenter.addListener("game", this.updateMessage);
  }

  componentWillUnmount() {
    this.eventsCenter.destroy();
  }

  updateMessage = (message) => {
    this.setState(state => ({
      messages: [...state.messages, message],
    }))
  }

  render() {
    return (
      <div style={{display: "flex"}}>
        <Game />
        <Chat
          messages={this.state.messages}
          eventsCenter={this.eventsCenter}
        />
      </div>
    )
  }
}

export default GameContainer;
