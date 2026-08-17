import React, { useState, useEffect } from 'react';
import './index.css';

interface Card {
  id: string;
  pairId: string;
  content: string;
  type: 'problem' | 'answer';
  isFlipped: boolean;
  isMatched: boolean;
}

export const App: React.FC = () => {
  // Multi-selection of multiplication numbers 1 to 10
  const [selectedTables, setSelectedTables] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const [pairCount, setPairCount] = useState<number>(8);
  const [gameMode, setGameMode] = useState<'1player' | '2players'>('2players');
  
  // Game state
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchedPairsCount, setMatchedPairsCount] = useState<number>(0);
  const [moves, setMoves] = useState<number>(0);
  const [timer, setTimer] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isVictory, setIsVictory] = useState<boolean>(false);
  
  // 2 Players state
  const [activePlayer, setActivePlayer] = useState<1 | 2>(1);
  const [player1Score, setPlayer1Score] = useState<number>(0);
  const [player2Score, setPlayer2Score] = useState<number>(0);

  const toggleTableSelection = (tableNum: number) => {
    if (selectedTables.includes(tableNum)) {
      if (selectedTables.length === 1) return; // Keep at least one selected
      setSelectedTables(selectedTables.filter((t) => t !== tableNum));
    } else {
      setSelectedTables([...selectedTables, tableNum].sort((a, b) => a - b));
    }
  };

  const selectAllTables = () => {
    setSelectedTables([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  };

  // Generate cards deck
  const initializeGame = () => {
    const pairsPool: { problem: string; answer: string }[] = [];

    const tablesToUse = selectedTables.length > 0 ? selectedTables : [1];
    tablesToUse.forEach((tableNum) => {
      for (let j = 1; j <= 10; j++) {
        pairsPool.push({
          problem: `${tableNum} × ${j}`,
          answer: `${tableNum * j}`,
        });
      }
    });

    // Filter pairsPool so that every product (answer) in a single game round is unique
    const uniqueProductMap = new Map<number, { problem: string; answer: string }>();
    const shuffledPool = [...pairsPool].sort(() => Math.random() - 0.5);
    
    shuffledPool.forEach((item) => {
      const val = parseInt(item.answer, 10);
      if (!uniqueProductMap.has(val)) {
        uniqueProductMap.set(val, item);
      }
    });

    const selectedPairs = Array.from(uniqueProductMap.values()).slice(
      0,
      Math.min(pairCount, uniqueProductMap.size)
    );

    // Construct deck of cards
    const deck: Card[] = [];
    selectedPairs.forEach((pair, index) => {
      const pairId = `pair-${index}-${pair.problem}`;
      deck.push({
        id: `${pairId}-prob`,
        pairId,
        content: pair.problem,
        type: 'problem',
        isFlipped: false,
        isMatched: false,
      });
      deck.push({
        id: `${pairId}-ans`,
        pairId,
        content: pair.answer,
        type: 'answer',
        isFlipped: false,
        isMatched: false,
      });
    });

    const shuffledDeck = deck.sort(() => Math.random() - 0.5);

    setCards(shuffledDeck);
    setFlippedCards([]);
    setMatchedPairsCount(0);
    setMoves(0);
    setTimer(0);
    setIsPlaying(false);
    setIsVictory(false);
    setActivePlayer(1);
    setPlayer1Score(0);
    setPlayer2Score(0);
  };

  useEffect(() => {
    initializeGame();
  }, [selectedTables, pairCount, gameMode]);

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying && !isVictory) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isVictory]);

  // Card click handler
  const handleCardClick = (index: number) => {
    if (!isPlaying) {
      setIsPlaying(true);
    }

    if (
      cards[index].isFlipped ||
      cards[index].isMatched ||
      flippedCards.length === 2
    ) {
      return;
    }

    const newFlipped = [...flippedCards, index];
    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [firstIdx, secondIdx] = newFlipped;
      const firstCard = newCards[firstIdx];
      const secondCard = newCards[secondIdx];

      // Helper to evaluate numerical value of card content
      const getCardValue = (card: Card): number => {
        if (card.type === 'answer') {
          return parseInt(card.content, 10);
        }
        const parts = card.content.split('×');
        if (parts.length === 2) {
          return parseInt(parts[0].trim(), 10) * parseInt(parts[1].trim(), 10);
        }
        return NaN;
      };

      const isMathMatch = (c1: Card, c2: Card): boolean => {
        if (c1.type === c2.type) return false;
        return getCardValue(c1) === getCardValue(c2);
      };

      if (firstCard.pairId === secondCard.pairId || isMathMatch(firstCard, secondCard)) {
        // MATCH FOUND
        setTimeout(() => {
          setCards((prev) => {
            const updated = [...prev];
            updated[firstIdx].isMatched = true;
            updated[secondIdx].isMatched = true;
            return updated;
          });
          setFlippedCards([]);
          
          if (gameMode === '2players') {
            if (activePlayer === 1) {
              setPlayer1Score((s) => s + 1);
            } else {
              setPlayer2Score((s) => s + 1);
            }
          }

          setMatchedPairsCount((prev) => {
            const nextCount = prev + 1;
            if (nextCount === cards.length / 2) {
              setIsVictory(true);
              setIsPlaying(false);
            }
            return nextCount;
          });
        }, 500);
      } else {
        // NO MATCH -> Switch turn in 2 Player mode & unflip cards
        setTimeout(() => {
          setCards((prev) => {
            const updated = [...prev];
            updated[firstIdx].isFlipped = false;
            updated[secondIdx].isFlipped = false;
            return updated;
          });
          setFlippedCards([]);
          if (gameMode === '2players') {
            setActivePlayer((curr) => (curr === 1 ? 2 : 1));
          }
        }, 1000);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getWinnerText = () => {
    if (gameMode === '1player') return '!פתרתם את כל הזוגות';
    if (player1Score > player2Score) return '👑 שחקן 1 ניצח!';
    if (player2Score > player1Score) return '👑 שחקן 2 ניצח!';
    return '🤝 תיקו!';
  };

  return (
    <div dir="rtl" className="hebrew-container">
      <header className="app-header">
        <h1 className="app-title">מאסטר משחק הזיכרון - לוח הכפל 🧠✨</h1>
        <p className="app-subtitle">
          בחרו את לוחות הכפל, מספר הזוגות ושחקו יחיד או בשני שחקנים!
        </p>
      </header>

      <section className="controls-panel">
        <div className="control-group" style={{ flex: '2', minWidth: '300px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="control-label">בחירת לוחות כפל (1-10)</label>
            <button
              onClick={selectAllTables}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-cyan)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              בחר הכל (1-10)
            </button>
          </div>
          <div className="number-chips-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
              const isSelected = selectedTables.includes(num);
              return (
                <button
                  key={num}
                  type="button"
                  className={`chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleTableSelection(num)}
                >
                  ×{num}
                </button>
              );
            })}
          </div>
        </div>

        <div className="control-group">
          <label className="control-label">מצב משחק</label>
          <div className="mode-toggle-group">
            <button
              type="button"
              className={`mode-btn ${gameMode === '1player' ? 'active' : ''}`}
              onClick={() => setGameMode('1player')}
            >
              👤 שחקן יחיד
            </button>
            <button
              type="button"
              className={`mode-btn ${gameMode === '2players' ? 'active' : ''}`}
              onClick={() => setGameMode('2players')}
            >
              👥 2 שחקנים
            </button>
          </div>
        </div>

        <div className="control-group">
          <label className="control-label">כמות זוגות</label>
          <div className="slider-container">
            <input
              type="range"
              className="range-slider"
              min={4}
              max={15}
              value={pairCount}
              onChange={(e) => setPairCount(Number(e.target.value))}
            />
            <span className="slider-value">{pairCount}</span>
          </div>
        </div>

        <button className="btn-restart" onClick={initializeGame}>
          🔄 איפוס משחק
        </button>
      </section>

      {gameMode === '2players' && (
        <section className="players-turn-bar">
          <div className={`player-card ${activePlayer === 1 ? 'active-player p1' : ''}`}>
            <div className="player-badge">שחקן 1</div>
            <div className="player-score-val">{player1Score} זוגות</div>
            {activePlayer === 1 && <span className="turn-indicator">תורך ✨</span>}
          </div>
          <div className={`player-card ${activePlayer === 2 ? 'active-player p2' : ''}`}>
            <div className="player-badge">שחקן 2</div>
            <div className="player-score-val">{player2Score} זוגות</div>
            {activePlayer === 2 && <span className="turn-indicator">תורך ✨</span>}
          </div>
        </section>
      )}

      <section className="stats-bar">
        <div className="stat-item">
          <span className="stat-value">{moves}</span>
          <span className="stat-label">מהלכים</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{formatTime(timer)}</span>
          <span className="stat-label">זמן</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">
            {matchedPairsCount} / {cards.length / 2}
          </span>
          <span className="stat-label">זוגות שנמצאו</span>
        </div>
      </section>

      <main className="game-grid">
        {cards.map((card, index) => (
          <div
            key={card.id}
            className="card-wrapper"
            onClick={() => handleCardClick(index)}
          >
            <div
              className={`card ${card.isFlipped ? 'flipped' : ''} ${
                card.isMatched ? 'matched' : ''
              }`}
            >
              <div className="card-face card-back">
                <div className="card-pattern">❓</div>
              </div>
              <div className={`card-face card-front card-type-${card.type}`}>
                <div className="card-content">{card.content}</div>
              </div>
            </div>
          </div>
        ))}
      </main>

      {isVictory && (
        <div className="modal-overlay">
          <div className="victory-modal">
            <div className="victory-icon">🏆</div>
            <h2 className="victory-title">{getWinnerText()}</h2>
            <div className="victory-stats">
              {gameMode === '2players' ? (
                <>
                  <div>
                    <div className="stat-value">{player1Score}</div>
                    <div className="stat-label">ניקוד שחקן 1</div>
                  </div>
                  <div>
                    <div className="stat-value">{player2Score}</div>
                    <div className="stat-label">ניקוד שחקן 2</div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="stat-value">{moves}</div>
                    <div className="stat-label">סה"כ מהלכים</div>
                  </div>
                  <div>
                    <div className="stat-value">{formatTime(timer)}</div>
                    <div className="stat-label">זמן שחלף</div>
                  </div>
                </>
              )}
            </div>
            <button className="btn-restart" style={{ width: '100%' }} onClick={initializeGame}>
              שחק שוב 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
