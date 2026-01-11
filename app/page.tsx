'use client';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
interface SquareState {
  letter: string;
  status: 'empty' | 'correct' | 'absent' | 'selected';
}

export default function WordleHelper() {
  const [correctWord, setCorrectWord] = useState('');
  const [grid, setGrid] = useState<SquareState[][]>(
    Array(6).fill(null).map(() =>
      Array(5).fill(null).map(() => ({ letter: '', status: 'empty' }))
    )
  );
  const [selectedPositions, setSelectedPositions] = useState<Set<number>>(new Set());
  const [currentRow, setCurrentRow] = useState(0);
  const [validWords, setValidWords] = useState<string[]>([]);

  const [errorMessage, setErrorMessage] = useState<string>()
  const [spoiler, setSpoiler] = useState(false);

  useEffect(() => {
    const loadDictionary = async () => {
      try {
        const response = await fetch('/dict.txt');
        const text = await response.text();
        const words = text
          .split('\n')
          .map(word => word.trim().toLowerCase())
          .filter(word => word.length === 5 && word.length > 0);

        console.log(`Loaded ${words.length} words`);
        setValidWords(words);
      } catch (error) {
        console.error('Failed to load dictionary:', error);
      }

    }

    const loadTodayWord = async () => {
      const res = await fetch('/api/wordle');

      if (res.ok) {
        const data = await res.json();
        console.log('Today\'s Wordle solution:', data.solution);
        return setCorrectWord(data.solution)
      }
      return '';
    };

    loadDictionary()
    loadTodayWord()
  }, []);

  const handleSquareClick = (rowIndex: number, colIndex: number) => {
    if (!correctWord || rowIndex !== currentRow) return;
    if (grid[rowIndex][colIndex].letter !== '') return;

    const newSelectedPositions = new Set(selectedPositions);

    if (selectedPositions.has(colIndex)) newSelectedPositions.delete(colIndex);
    else newSelectedPositions.add(colIndex);

    setSelectedPositions(newSelectedPositions);

    const newGrid = [...grid];
    newGrid[rowIndex][colIndex] = {
      letter: '',
      status: newSelectedPositions.has(colIndex) ? 'selected' : 'empty'
    };

    setGrid(newGrid);
  };

  const handleDone = () => {
    if (selectedPositions.size === 0) return;

    // Find best word that matches ONLY the selected positions (and doesn't match other positions)
    const selectedArray = Array.from(selectedPositions);

    const matchingWords = validWords.filter(word => {
      if (word.length !== 5) return false;

      // Check if all selected positions match the correct word
      const selectedMatch = selectedArray.every(pos => word[pos] === correctWord[pos]);

      // Check that NON-selected positions don't match the correct word
      const nonSelectedDontMatch = [0, 1, 2, 3, 4].every(pos => {
        if (selectedPositions.has(pos)) return true; // Skip selected positions
        return word[pos] !== correctWord[pos]; // Non-selected should NOT match
      });

      return selectedMatch && nonSelectedDontMatch;
    });

    if (matchingWords.length > 0) {
      const bestWord = matchingWords[0];
      const newGrid = [...grid];

      for (let i = 0; i < 5; i++) {
        const char = bestWord[i];
        let status: 'correct' | 'absent' = 'absent';

        if (selectedPositions.has(i)) status = 'correct';

        newGrid[currentRow][i] = {
          letter: char.toUpperCase(),
          status
        };
      }

      setGrid(newGrid);
      setSelectedPositions(new Set());

      if (bestWord === correctWord) {
        setTimeout(() => {
          // alert('Congratulations! You found the word!');
        }, 500);
      } else if (currentRow < 5) {
        setCurrentRow(currentRow + 1);
      }
    } else {
      alert('No valid word found with the selected positions. Try selecting different squares.');
    }
  };

  const clearGrid = () => {
    setGrid(
      Array(6).fill(null).map(() =>
        Array(5).fill(null).map(() => ({ letter: '', status: 'empty' }))
      )
    );
    setSelectedPositions(new Set());
    setCurrentRow(0);
  };

  const getSquareColor = (status: string) => {
    switch (status) {
      case 'correct':
        return 'bg-green-500 text-white border-green-500';
      case 'absent':
        return 'bg-gray-500 text-white border-gray-500';
      case 'selected':
        return 'bg-blue-400 text-white border-blue-500';
      default:
        return 'bg-white border-gray-300';
    }
  };

  return (
    <div className="min-h-screen scheme-dark p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2">Wordle Cheater</h1>

        {correctWord && (
          <div className="text-center mb-4 p-4 bg-blue-100 rounded-lg">
            <p className="text-sm text-gray-600">Today&apos;s word:</p>
            <p className={`text-2xl font-bold ${spoiler ? 'text-blue-600' : 'text-gray-400 cursor-pointer'}`} onClick={() => setSpoiler(!spoiler)}>{spoiler ? correctWord.toUpperCase() : 'Click to Show'}</p>
          </div>
        )}

        <div className="flex justify-center mb-6">
          <div className="flex flex-col gap-2">
            {grid.map((row, rowIndex) => (
              <div key={rowIndex} className="flex gap-2 items-center">
                <div className="flex gap-2 ml-30">
                  {row.map((square, colIndex) => (
                    <button
                      key={colIndex}
                      onClick={() => handleSquareClick(rowIndex, colIndex)}
                      disabled={rowIndex !== currentRow || square.letter !== ''}
                      className={`h-16 w-16 border-2 flex items-center justify-center text-2xl font-bold transition-all duration-200 ${getSquareColor(square.status)} ${rowIndex === currentRow && square.letter === '' ? 'hover:border-blue-500 cursor-pointer' : 'cursor-not-allowed'
                        } ${rowIndex !== currentRow && square.letter === '' ? 'opacity-40' : ''
                        }`}
                    >
                      {square.letter}
                    </button>
                  ))}
                </div>

                {/* Done Button - appears only on current row when squares are selected */}
                <div className="w-24 ml-4">
                  {rowIndex === currentRow && selectedPositions.size > 0 && (
                    <Button
                      onClick={handleDone}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-6"
                    >
                      Done
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-6">
          <Button onClick={clearGrid} variant="outline" className="px-6">
            Reset Grid
          </Button>
        </div>
      </div>
    </div>
  );
}