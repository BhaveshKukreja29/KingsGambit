import { Chessboard } from 'react-chessboard';

const Board = ({ fen, onPieceDrop, playerColor, game, status }) => {

  const isDraggable = ({ piece }) => {
    if (game.isGameOver()) return false;
    
    const isMyTurn = (game.turn() === 'w' && playerColor === 'white') || 
                     (game.turn() === 'b' && playerColor === 'black');
    if (!isMyTurn) return false;

    const isMyPiece = piece.startsWith(playerColor.charAt(0));
    
    return isMyPiece;
  };

  return (
    <>
      <div id="gameStatus">
        <h2>{status}</h2>
      </div>
      <div id="board">
        <Chessboard
          position={fen}
          onPieceDrop={onPieceDrop}
          boardOrientation={playerColor}
          isDraggablePiece={isDraggable}
        />
      </div>
    </>
  );
};

export default Board;