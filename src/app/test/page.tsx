"use client";

import { useState } from "react";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { arrayMove } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DownloadIcon, GrabIcon, CheckIcon } from "lucide-react";
import * as XLSX from "xlsx";
import { AnimatedSubscribeButton } from "@/components/ui/animated-subscribe-button";
import { AuroraText } from "@/components/ui/aurora-text";

// Define the type for each row in the sheet
interface Row {
  [key: string]: string | number; // Each cell can be a string or number
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null); // File state
  const [repartitionedFile, setRepartitionedFile] = useState<string | null>(
    null
  ); // Output file state
  const [classes, setClasses] = useState([
    { name: "Salle 1", capacity: 2 },
    { name: "Salle 2", capacity: 2 },
  ]); // Classes state

  const [newClassName, setNewClassName] = useState("");
  const [newClassCapacity, setNewClassCapacity] = useState("");
  const [error, setError] = useState("");

  const [activeId, setActiveId] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setError("");
  };

  const repartitionFile = () => {
    if (!file) {
      setError("Veuillez importer un fichier");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const wb = XLSX.read(event.target?.result as ArrayBuffer, {
        type: "array",
      });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const jsonData: Row[] = XLSX.utils.sheet_to_json<Row>(sheet, {
        defval: "",
      }); // Specify type and preserve empty cells
      let rows = [...jsonData]; // Copy the rows of the sheet

      let classIndex = 0;
      let currentClass = classes[classIndex];
      let rowIndex = 1;

      rows = rows.map((row) => {
        if (rowIndex > currentClass.capacity) {
          classIndex += 1;
          if (classIndex < classes.length) {
            currentClass = classes[classIndex];
            rowIndex = 1;
          } else {
            return row;
          }
        }

        row["Locale"] =
          currentClass?.name + "(" + currentClass?.capacity + ")" || "No Class";
        rowIndex++;
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const newWb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWb, ws, "Sheet1");
      const xlsFile = XLSX.write(newWb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([xlsFile], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      setRepartitionedFile(url); // Correctly set the file URL
    };

    reader.readAsArrayBuffer(file);
  };

  const handleAddClass = () => {
    if (newClassName && newClassCapacity) {
      setClasses([
        ...classes,
        { name: newClassName, capacity: parseInt(newClassCapacity) },
      ]);
      setNewClassName("");
      setNewClassCapacity("");
    }
  };

  const handleRemoveClass = (index: number) => {
    setClasses((prevClasses) => prevClasses.filter((_, i) => i !== index));
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = classes.findIndex((cls) => cls.name === active.id);
      const newIndex = classes.findIndex((cls) => cls.name === over?.id);
      setClasses((prevClasses) => arrayMove(prevClasses, oldIndex, newIndex));
    }

    setActiveId(null);
  };

  return (
    <div className="max-w-4xl p-4 mx-auto space-y-10">
      <h1 className="text-4xl font-bold tracking-tighter text-center md:text-5xl lg:text-7xl">
        <AuroraText>Répartition des Salles</AuroraText>
      </h1>

      <div className="mb-6">
        <label className="block mb-2 text-lg">
          Importer le fichier étudiants
        </label>
        <Input
          type="file"
          accept=".xls,.xlsx"
          onChange={handleFileUpload}
          className={`w-full p-2 text-lg border rounded-lg ${
            error && "border-red-500"
          }`}
        />
      </div>

      <h2 className="mb-4 text-2xl font-semibold">Locaux:</h2>
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <SortableContext
          items={classes.map((cls) => cls.name)}
          strategy={verticalListSortingStrategy}
        >
          <div className="mb-6">
            <ul className="pl-6 list-disc">
              {classes.map((cls, index) => (
                <SortableItem
                  key={cls.name}
                  id={cls.name}
                  capacity={cls.capacity}
                  onRemove={() => handleRemoveClass(index)}
                />
              ))}
            </ul>
          </div>
        </SortableContext>

        <DragOverlay>
          {activeId ? (
            <DraggedItem
              id={activeId}
              capacity={
                classes.find((cls) => cls.name === activeId)?.capacity || 0
              }
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="flex mt-4 mb-6 space-x-4">
        <Input
          type="text"
          value={newClassName}
          onChange={(e) => setNewClassName(e.target.value)}
          placeholder="Locale"
          className="w-1/2"
        />
        <Input
          type="number"
          value={newClassCapacity}
          onChange={(e) => setNewClassCapacity(e.target.value)}
          placeholder="Capacité"
          className="w-1/2"
        />
        <Button onClick={handleAddClass}>Ajouter Locale</Button>
      </div>

      <div className="flex flex-col justify-between gap-1 mb-6">
        <Button onClick={repartitionFile}>Repartitionner le fichier</Button>
        {error && <p className="text-red-500">{error}</p>}
      </div>

      {repartitionedFile && (
        <div className="w-full text-center">
          <AnimatedSubscribeButton
            className="w-36"
            duration={1500}
            subscribedBgColor="bg-green-500"
          >
            <span className="flex items-center justify-center w-full">
              <a
                href={repartitionedFile}
                download="repartitioned_students.xlsx"
                className="flex items-center justify-center w-full"
              >
                Download
                <DownloadIcon className="ml-1" />
              </a>
            </span>
            <span>
              <CheckIcon className="mr-2" />
            </span>
          </AnimatedSubscribeButton>
        </div>
      )}
    </div>
  );
}

const SortableItem = ({
    id,
    capacity,
    onRemove,
  }: {
    id: string;
    capacity: number;
    onRemove: () => void;
  }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id });
  
    return (
      <li
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className={`flex items-center justify-between p-2 m-2 rounded-md bg-slate-100 ${
          isDragging ? "bg-blue-100 shadow-lg" : ""
        }`}
      >
        <div className="flex items-center space-x-2">
          {/* Drag Handle Icon */}
          <svg
            className="text-gray-600 cursor-grab"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
          >
            <g fill="none">
              <path d="m12.594 23.258l-.012.002l-.071.035l-.02.004l-.014-.004l-.071-.036q-.016-.004-.024.006l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.016-.018m.264-.113l-.014.002l-.184.093l-.01.01l-.003.011l.018.43l.005.012l.008.008l.201.092q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.003-.011l.018-.43l-.003-.012l-.01-.01z" />
              <path
                fill="currentColor"
                d="M9 4a2 2 0 1 1 0 4a2 2 0 0 1 0-4m2 8a2 2 0 1 0-4 0a2 2 0 0 0 4 0m0 6a2 2 0 1 0-4 0a2 2 0 0 0 4 0m6-6a2 2 0 1 0-4 0a2 2 0 0 0 4 0m-2 4a2 2 0 1 1 0 4a2 2 0 0 1 0-4m2-10a2 2 0 1 0-4 0a2 2 0 0 0 4 0"
              />
            </g>
          </svg>
          <span className="font-semibold">{id}</span>
          <span className="text-gray-500">({capacity})</span>
        </div>
        <Button variant="destructive" size="sm" onClick={onRemove}>
          Supprimer
        </Button>
      </li>
    );
  };
  

const DraggedItem = ({ id, capacity }: { id: string; capacity: number }) => (
  <div className="p-2 bg-gray-200 border border-gray-300 rounded cursor-move opacity-80">
    {id} ({capacity})
  </div>
);
