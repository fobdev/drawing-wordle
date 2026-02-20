"use client";
import { Button } from "@/components/ui/button";
import { Languages, Undo2, UndoDot, Check, Github } from "lucide-react";
import { Toast } from "@/components/Toast";
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

  const [isShaking, setIsShaking] = useState(false);

  const [toast, setToast] = useState<{ message: string; isVisible: boolean }>({
    message: "",
    isVisible: false,
  });

  const showMessage = (msg: string) => {
    setToast({ message: msg, isVisible: true });
  };

  const closeToast = () => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  };

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
    // Create a copy of the row to modify, to avoid mutating state directly
    newGrid[rowIndex] = [...newGrid[rowIndex]];

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
      // Clone the row to modify
      newGrid[currentRow] = [...newGrid[currentRow]];

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
        showMessage(
          language === "en"
            ? "Word found!"
            : "Palavra encontrada!",
        );
      } else if (currentRow < 5) {
        setCurrentRow(currentRow + 1);
      }
    } else {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);

      showMessage(
        language === "en"
          ? "No valid word found"
          : "Nenhuma palavra válida encontrada",
      );
    }
  };

  const handleUndo = () => {
    // Can only undo if we're not on the first row
    if (currentRow === 0) return;

    // Clear the previous row and go back
    const previousRow = currentRow - 1;

    // Create a deep copy of the grid structure regarding the rows we touch
    const newGrid = [...grid];

    // Clear the previous row (which is becoming the current row)
    newGrid[previousRow] = Array(5)
      .fill(null)
      .map(() => ({
        letter: "",
        status: "empty",
      }));

    // Also clear the current row (the one we are leaving) to remove any selected squares
    newGrid[currentRow] = Array(5)
      .fill(null)
      .map(() => ({
        letter: "",
        status: "empty",
      }));

    setGrid(newGrid);
    setCurrentRow(previousRow);
    setSelectedPositions(new Set());
    setIsShaking(false);
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

  const getSquareColor = (status: string, rowIndex: number) => {
    if (rowIndex === currentRow && isShaking) {
      return "bg-[#121213] border-red-500 text-white";
    }

    switch (status) {
      case "correct":
        return "bg-[#538d4e] text-white border-[#538d4e]";
      case "absent":
        return "bg-[#3a3a3c] text-white border-[#3a3a3c]";
      case "selected":
        return "bg-[#538d4e] text-white border-[#538d4e]";
      default:
        return "bg-[#121213] text-white border-[#3a3a3c]";
    }
  };

  // Check if undo is available
  const canUndo =
    currentRow > 0 && grid[currentRow].every((square) => square.letter === "");

  const canRestart =
    currentRow > 0 ||
    grid.some((row) => row.some((square) => square.letter !== ""));

  return (
    <div className="min-h-screen bg-[#121213] p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <Toast
          message={toast.message}
          isVisible={toast.isVisible}
          onClose={closeToast}
        />
        {/* Language Selector */}
        <div className="flex justify-end mb-6">
          <div className="inline-flex rounded-lg bg-[#121213] border border-[#3a3a3c] p-1">
            <button
              onClick={onChangeLanguage}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${language === "en"
                ? "bg-[#538d4e] text-white"
                : "text-[#818384] hover:text-white"
                }`}
            >
              <Languages className="w-4 h-4" />
              English
            </button>
            <button
              onClick={onChangeLanguage}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${language === "pt-BR"
                ? "bg-[#538d4e] text-white"
                : "text-[#818384] hover:text-white"
                }`}
            >
              <Languages className="w-4 h-4" />
              Português
            </button>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-center mb-2 text-white font-serif tracking-wider">
          Drawing Wordle
        </h1>
        <h3 className="text-lg font-medium text-center mb-8 text-[#818384] tracking-wide font-sans">
          {language === "en"
            ? "Draw anything in the Wordle grid - line by line!"
            : "Desenhe qualquer coisa na grade do Wordle - linha por linha!"}
        </h3>

        {correctWord && (
          <div className="text-center mb-6 p-4 bg-[#121213] rounded-xl border border-[#3a3a3c] select-none cursor-pointer hover:border-[#565758] transition-all">
            <p className="text-sm text-[#818384]">
              {language === "en" ? `Today's word` : "Palavra de Hoje"}
            </p>
            <p
              className={`text-2xl font-bold font-mono tracking-widest ${spoiler ? "text-[#538d4e]" : "text-[#818384] cursor-pointer"}`}
              onClick={() => setSpoiler(!spoiler)}
            >
              {spoiler
                ? correctWord.toUpperCase()
                : `${language === "en" ? "Click to show" : "Clique para exibir"}`}
            </p>
            <p className="text-sm text-[#818384] opacity-50">
              {language === "en" ? "from wordle.com" : "de wordle.com"}
            </p>
          </div>
        )}

        <div className="flex justify-center mb-6">
          <div className="flex flex-col gap-2">
            {grid.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className={`flex gap-2 items-center ${rowIndex === currentRow && isShaking ? "shake" : ""
                  }`}
              >
                <div className="flex gap-2 md:ml-30">
                  {row.map((square, colIndex) => (
                    <button
                      key={colIndex}
                      onClick={() => handleSquareClick(rowIndex, colIndex)}
                      disabled={rowIndex !== currentRow || square.letter !== ""}
                      className={`h-16 w-16 border-2 flex items-center justify-center text-3xl font-bold transition-all duration-200 select-none ${getSquareColor(square.status, rowIndex)} ${rowIndex === currentRow && square.letter === ""
                        ? "hover:border-[#565758] cursor-pointer"
                        : "cursor-not-allowed"
                        } ${rowIndex !== currentRow && square.letter === ""
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
                      className="bg-[#538d4e] hover:bg-[#467b41] text-white font-bold px-6 border-none"
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
          <div className="inline-flex rounded-lg bg-[#818384] p-0.5">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className={`px-4 py-2 rounded-md text-sm font-bold uppercase transition-all flex items-center gap-2 ${canUndo
                ? "text-white hover:bg-[#565758] cursor-pointer"
                : "text-[#3a3a3c] cursor-not-allowed"
                }`}
            >
              <Undo2 className="w-4 h-4" />
              {language === "en" ? "Undo" : "Desfazer"}
            </button>
          </div>
          <div className="md:hidden inline-flex rounded-lg bg-[#818384] p-0.5">
            <button
              onClick={handleDone}
              disabled={selectedPositions.size === 0}
              className={`px-4 py-2 rounded-md text-sm font-bold uppercase transition-all flex items-center gap-2 ${selectedPositions.size > 0
                ? "bg-[#538d4e] text-white"
                : "text-[#3a3a3c] cursor-not-allowed"
                }`}
            >
              <Check className="w-4 h-4" />
              {language === "en" ? "Submit" : "Enviar"}
            </button>
          </div>
          <div className="inline-flex rounded-lg bg-[#818384] p-0.5">
            <button
              disabled={!canRestart}
              onClick={clearGrid}
              className={`px-4 py-2 rounded-md text-sm font-bold uppercase transition-all flex items-center gap-2 ${canRestart
                ? "text-white hover:bg-[#565758] cursor-pointer"
                : "text-[#3a3a3c] cursor-not-allowed"
                }`}
            >
              <UndoDot className="w-4 h-4" />
              {language === "en" ? "Restart" : "Reiniciar"}
            </button>
          </div>
        </div>

        <footer className="mt-12 py-6 text-center text-[#565758] text-sm border-t border-[#3a3a3c]">
          <div className="flex items-center justify-center gap-1 flex-wrap">
            <span>
              &copy; {new Date().getFullYear()} Drawing Wordle. All rights
              reserved. Created by
            </span>
            <a
              href="https://github.com/fobdev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#538d4e] hover:text-white transition-colors font-bold inline-flex items-center gap-1"
            >
              <Github className="w-4 h-4" />
              fobdev
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
