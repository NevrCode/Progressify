import { createContext, useContext, useState } from "react";

const formatDate = (d: Date) =>
  [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");

interface DiaryContextType {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

const DiaryContext = createContext<DiaryContextType>({
  selectedDate: formatDate(new Date()),
  setSelectedDate: () => {},
});

export const DiaryProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  return (
    <DiaryContext.Provider value={{ selectedDate, setSelectedDate }}>
      {children}
    </DiaryContext.Provider>
  );
};

export const useDiaryContext = () => useContext(DiaryContext);
