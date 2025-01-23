"use client";

import { AnimatedSubscribeButton } from "@/components/ui/animated-subscribe-button";
import { AuroraText } from "@/components/ui/aurora-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckIcon, DownloadIcon } from "lucide-react";
import { useState } from "react";
import * as XLSX from "xlsx";

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

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setError("");
  };

  // Repartition rows into classes
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

      // Assign each row to a class
      rows = rows.map((row) => {
        if (rowIndex > currentClass.capacity) {
          // Move to the next class if capacity is reached
          classIndex += 1;
          if (classIndex < classes.length) {
            currentClass = classes[classIndex];
            rowIndex = 1;
          } else {
            return row;
          }
        }

        row["Locale"] =
          currentClass?.name + "(" + currentClass?.capacity + ")" || "No Class"; // Add new column with class name
        rowIndex++;
        return row;
      });

      // Modify the Excel sheet with the new column
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

  // Add new classes dynamically
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

  // Remove a class
  const handleRemoveClass = (index: number) => {
    const updatedClasses = classes.filter((_, i) => i !== index);
    setClasses(updatedClasses);
  };

  return (
    <div className="max-w-4xl p-4 mx-auto space-y-7">
      <h3 className="text-2xl font-bold tracking-tighter text-center md:text-5xl lg:text-6xl">
        <AuroraText>FSJES</AuroraText> - Répartition des Lists
      </h3>

      {/* File Upload */}
      <div className="mb-6">
        <label className="block mb-2 text-lg">
          Importer le fichier étudiants
        </label>
        <Input
          type="file"
          accept=".xls,.xlsx"
          onChange={handleFileUpload}
          className={`"w-full p-2 text-lg border rounded-lg" ${
            error && "border-red-500"
          }`}
        />
      </div>

      {/* Class List */}
      <h2 className="mb-4 text-2xl font-semibold">Locaux: </h2>
      <div className="mb-6">
        <ul className="pl-6 list-disc">
          {classes.map((cls, index) => (
            <li
              key={index}
              className="flex items-center justify-between p-2 m-2 rounded-md bg-slate-100"
            >
              <div>
                <span className="font-semibold">{cls.name}: </span>
                <span>{cls.capacity}</span>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleRemoveClass(index)}
              >
                Suprimer
              </Button>
            </li>
          ))}
        </ul>
      </div>

      {/* Add New Class Form */}
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

      {/* Repartition Button */}
      <div className="flex flex-col justify-between gap-1 mb-6">
        <Button onClick={repartitionFile}>Repartitionner</Button>
        {error && <p className="text-red-500">{error}</p>}
      </div>

      {/* Download Link */}
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
                <DownloadIcon className="ml-1 transition-transform duration-300 size-4 group-hover:translate-x-1" />
              </a>
            </span>
            <span className="inline-flex items-center group">
              <CheckIcon className="mr-2 size-4" />
            </span>
          </AnimatedSubscribeButton>
        </div>
      )}
    </div>
  );
}
