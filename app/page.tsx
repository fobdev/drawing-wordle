"use client";
import { Button } from "@/components/ui/button";
import { Languages, Undo2, UndoDot, Check } from "lucide-react";
import { showToast } from "nextjs-toast-notify";
import { useEffect, useState } from "react";
interface SquareState {
  letter: string;
  status: "empty" | "correct" | "absent" | "selected";
}

export default function WordleHelper() {
  const [correctWord, setCorrectWord] = useState("");
  const [grid, setGrid] = useState<SquareState[][]>(
    Array(6)
      .fill(null)
      .map(() =>
        Array(5)
          .fill(null)
          .map(() => ({ letter: "", status: "empty" })),
      ),
  );
  const [selectedPositions, setSelectedPositions] = useState<Set<number>>(
    new Set(),
  );
  const [currentRow, setCurrentRow] = useState(0);
  const [validWords, setValidWords] = useState<string[]>([]);

  const [language, setLanguage] = useState<"en" | "pt-BR">(() => {
    if (typeof window !== "undefined") {
      const browserLang = navigator.language || navigator.languages?.[0];
      if (browserLang.startsWith("pt")) return "pt-BR";
    }
    return "en";
  });

  const onChangeLanguage = () => {
    clearGrid();
    setSpoiler(false);
    setLanguage(language === "en" ? "pt-BR" : "en");
  };

  const [spoiler, setSpoiler] = useState(false);

  useEffect(() => {
    const loadDictionary = async () => {
      try {
        const response = await fetch("/dict.txt");
        const text = await response.text();
        const words = text
          .split("\n")
          .map((word) => word.trim().toLowerCase())
          .filter((word) => word.length === 5 && word.length > 0);

        console.log(`Loaded ${words.length} words`);
        setValidWords(words);
      } catch (error) {
        console.error("Failed to load dictionary:", error);
      }
    };

    const loadTodayWord = async () => {
      const res = await fetch("/api/wordle");

      if (res.ok) {
        const data = await res.json();
        console.log("Today's Wordle solution:", data.solution);
        return setCorrectWord(data.solution);
      }
      return "";
    };

    loadDictionary();
    loadTodayWord();
  }, []);

  const handleSquareClick = (rowIndex: number, colIndex: number) => {
    if (!correctWord || rowIndex !== currentRow) return;
    if (grid[rowIndex][colIndex].letter !== "") return;

    const newSelectedPositions = new Set(selectedPositions);

    if (selectedPositions.has(colIndex)) newSelectedPositions.delete(colIndex);
    else newSelectedPositions.add(colIndex);

    setSelectedPositions(newSelectedPositions);

    const newGrid = [...grid];
    newGrid[rowIndex][colIndex] = {
      letter: "",
      status: newSelectedPositions.has(colIndex) ? "selected" : "empty",
    };

    setGrid(newGrid);
  };

  const handleDone = () => {
    if (selectedPositions.size === 0) return;
    const selectedArray = Array.from(selectedPositions);

    const matchingWords = validWords.filter((word) => {
      if (word.length !== 5) return false;

      const selectedMatch = selectedArray.every(
        (pos) => word[pos] === correctWord[pos],
      );

      const nonSelectedDontMatch = [0, 1, 2, 3, 4].every((pos) => {
        if (selectedPositions.has(pos)) return true;
        return word[pos] !== correctWord[pos];
      });

      return selectedMatch && nonSelectedDontMatch;
    });

    if (matchingWords.length > 0) {
      const bestWord = matchingWords[0];
      const newGrid = [...grid];

      for (let i = 0; i < 5; i++) {
        const char = bestWord[i];
        let status: "correct" | "absent" = "absent";

        if (selectedPositions.has(i)) status = "correct";

        newGrid[currentRow][i] = {
          letter: char.toUpperCase(),
          status,
        };
      }

      setGrid(newGrid);
      setSelectedPositions(new Set());

      if (bestWord === correctWord) {
        setTimeout(() => {
          showToast.success(
            language === "en"
              ? "Word found! Reset the grid to try other patterns."
              : "Palavra encontrada! Reinicie para tentar outros padrões.",
            {
              duration: 4000,
              progress: true,
              position: "top-center",
              transition: "popUp",
            },
          );
        }, 500);
      } else if (currentRow < 5) {
        setCurrentRow(currentRow + 1);
      }
    } else {
      showToast.error(
        language === "en"
          ? "No valid word found with the selected positions. Try selecting different squares."
          : "Nenhum palavra válida encontrada com as posições selecionadas.",
        {
          duration: 4000,
          progress: true,
          position: "top-center",
          transition: "popUp",
        },
      );
    }
  };

  const handleUndo = () => {
    // Can only undo if we're not on the first row and the current row is empty
    if (currentRow === 0) return;

    // Check if current row is empty (no letters filled)
    const currentRowEmpty = grid[currentRow].every(
      (square) => square.letter === "",
    );

    if (!currentRowEmpty) return; // Don't allow undo if current row has content

    // Clear the previous row and go back
    const newGrid = [...grid];
    const previousRow = currentRow - 1;

    newGrid[previousRow] = Array(5)
      .fill(null)
      .map(() => ({
        letter: "",
        status: "empty",
      }));

    setGrid(newGrid);
    setCurrentRow(previousRow);
    setSelectedPositions(new Set());
  };

  const clearGrid = () => {
    setGrid(
      Array(6)
        .fill(null)
        .map(() =>
          Array(5)
            .fill(null)
            .map(() => ({ letter: "", status: "empty" })),
        ),
    );
    setSelectedPositions(new Set());
    setCurrentRow(0);
  };

  const getSquareColor = (status: string) => {
    switch (status) {
      case "correct":
        return "bg-green-500 text-white border-green-500";
      case "absent":
        return "bg-gray-500 text-white border-gray-500";
      case "selected":
        return "bg-green-400 text-white border-blue-500";
      default:
        return "bg-white border-gray-300";
    }
  };

  // Check if undo is available
  const canUndo =
    currentRow > 0 && grid[currentRow].every((square) => square.letter === "");

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Language Selector */}
        <div className="flex justify-end mb-6">
          <div className="inline-flex rounded-lg bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-1">
            <button
              onClick={onChangeLanguage}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                language === "en"
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              <Languages className="w-4 h-4" />
              English
            </button>
            <button
              onClick={onChangeLanguage}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                language === "pt-BR"
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              <Languages className="w-4 h-4" />
              Português
            </button>
          </div>
        </div>

        <h1 className="text-5xl pb-6 font-bold text-center mb-2 bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Wordle Painter
        </h1>

        {correctWord && (
          <div className="text-center mb-6 p-4 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 select-none cursor-pointer hover:bg-slate-800/70 transition-all">
            <p className="text-sm text-slate-400">
              {language === "en" ? `Today's word:` : "Palavra de Hoje"}
            </p>
            <p
              className={`text-2xl font-bold ${spoiler ? "text-blue-400" : "text-slate-600 cursor-pointer"}`}
              onClick={() => setSpoiler(!spoiler)}
            >
              {spoiler
                ? correctWord.toUpperCase()
                : `${language === "en" ? "Click to show" : "Clique para exibir"}`}
            </p>
            <p className="text-sm text-slate-400 opacity-50">
              {language === "en" ? "from wordle.com" : "de term.ooo"}
            </p>
          </div>
        )}

        <div className="flex justify-center mb-6">
          <div className="flex flex-col gap-2">
            {grid.map((row, rowIndex) => (
              <div key={rowIndex} className="flex gap-2 items-center">
                <div className="flex gap-2 md:ml-30">
                  {row.map((square, colIndex) => (
                    <button
                      key={colIndex}
                      onClick={() => handleSquareClick(rowIndex, colIndex)}
                      disabled={rowIndex !== currentRow || square.letter !== ""}
                      className={`h-16 w-16 rounded-md flex items-center justify-center text-2xl font-bold transition-all duration-200 ${getSquareColor(square.status)} ${
                        rowIndex === currentRow && square.letter === ""
                          ? "hover:border-blue-500 cursor-pointer"
                          : "cursor-not-allowed"
                      } ${
                        rowIndex !== currentRow && square.letter === ""
                          ? "opacity-40"
                          : ""
                      }`}
                    >
                      {square.letter}
                    </button>
                  ))}
                </div>

                {/* Done Button */}
                <div className="hidden md:block w-24 ml-4">
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
        <div className="flex justify-center gap-4 mb-6">
          <div className="inline-flex rounded-lg bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-1">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                canUndo
                  ? "text-slate-400 hover:text-slate-300 cursor-pointer"
                  : "text-slate-600 cursor-not-allowed opacity-50"
              }`}
            >
              <Undo2 className="w-4 h-4" />
              {language === "en" ? "Undo" : "Desfazer"}
            </button>
          </div>
          <div className="md:hidden inline-flex rounded-lg bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-1">
            <button
              onClick={handleDone}
              disabled={selectedPositions.size === 0}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                selectedPositions.size > 0
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                  : "text-slate-600 cursor-not-allowed opacity-50"
              }`}
            >
              <Check className="w-4 h-4" />
              {language === "en" ? "Submit" : "Enviar"}
            </button>
          </div>
          <div className="inline-flex rounded-lg bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-1">
            <button
              disabled={!canUndo}
              onClick={clearGrid}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 text-slate-400 hover:text-slate-300 cursor-pointer ${
                canUndo
                  ? "text-slate-400 hover:text-slate-300 cursor-pointer"
                  : "text-slate-600 cursor-not-allowed opacity-50"
              }`}
            >
              <UndoDot className="w-4 h-4" />
              {language === "en" ? "Restart" : "Reiniciar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
