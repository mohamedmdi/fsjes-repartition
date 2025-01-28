"use client";

import { AnimatedSubscribeButton } from "@/components/ui/animated-subscribe-button";
import { AuroraText } from "@/components/ui/aurora-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import JSZip from "jszip";
import { saveAs } from "file-saver";

interface Row {
  [key: string]: string | number;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [classes, setClasses] = useState([
    { name: "Salle 1", capacity: 5 },
    { name: "Salle 2", capacity: 10 },
    { name: "Salle 3", capacity: 30 },
  ]);

  const [newClassName, setNewClassName] = useState("");
  const [newClassCapacity, setNewClassCapacity] = useState("");
  const [error, setError] = useState("");

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
    reader.onload = async (event) => {
      // Read the original file
      const wb = XLSX.read(event.target?.result as ArrayBuffer, {
        type: "array",
      });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const jsonData: Row[] = XLSX.utils.sheet_to_json<Row>(sheet, {
        defval: "",
      });
      let rows = [...jsonData];

      let classIndex = 0;
      let currentClass = classes[classIndex];
      let rowIndex = 1;
      let currentGroup: string | null = null;
      let sequenceNumber = 1; // Initialize sequence number

      // Process the data
      rows = rows.map((row) => {
        const group = row["Groupe"] as string;

        if (currentGroup !== null && group !== currentGroup) {
          classIndex += 1;
          if (classIndex < classes.length) {
            currentClass = classes[classIndex];
            rowIndex = 1;
            sequenceNumber = 1; // Reset sequence number for new class
          } else {
            return { ...row, "N°": sequenceNumber++ };
          }
        }

        if (rowIndex > currentClass.capacity) {
          classIndex += 1;
          if (classIndex < classes.length) {
            currentClass = classes[classIndex];
            rowIndex = 1;
            sequenceNumber = 1; // Reset sequence number for new class
          } else {
            return { ...row, "N°": sequenceNumber++ };
          }
        }

        currentGroup = group;
        rowIndex++;
        return {
          "N°": sequenceNumber++, // Add sequence number as first column
          ...row,
          Local:
            currentClass?.name + "(" + currentClass?.capacity + ")" ||
            "No Class",
        };
      });

      // Group rows by classroom
      const groupedRows: { [key: string]: Row[] } = {};
      rows.forEach((row) => {
        const salle = row["Local"] as string;
        if (!groupedRows[salle]) {
          groupedRows[salle] = [];
        }
        groupedRows[salle].push(row);
      });

      // Reset sequence numbers within each group
      Object.keys(groupedRows).forEach((salle) => {
        groupedRows[salle] = groupedRows[salle].map((row, index) => ({
          ...row,
          "N°": index + 1,
        }));
      });

      const zip = new JSZip();

      // Create a folder for original files
      const originalFolder = zip.folder("original");
      // Create a folder for modified files
      const modifiedFolder = zip.folder("modified");
      // Create a folder for PDFs
      const pdfsFolder = zip.folder("pdfs");

      // Add original Excel file
      originalFolder?.file(file.name, file);

      // Generate PDFs for each classroom
      Object.keys(groupedRows).forEach((salle) => {
        const doc = new jsPDF({
          orientation: "landscape",
          format: "a4",
        });
        const headers = Object.keys(groupedRows[salle][0]); // Use first row to get headers

        doc.text(`Salle: ${salle}`, 10, 10);

        const data = groupedRows[salle].map((row) =>
          headers.map((header) => row[header])
        );

        (doc as any).autoTable({
          head: [headers],
          body: data,
          startY: 20,
        });

        const pdfBlob = doc.output("blob");
        pdfsFolder?.file(`${salle}.pdf`, pdfBlob);
      });

      // Add modified Excel file
      const ws = XLSX.utils.json_to_sheet(rows);
      const newWb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWb, ws, "Sheet1");
      const xlsFile = XLSX.write(newWb, { bookType: "xlsx", type: "array" });
      modifiedFolder?.file("repartitioned_students.xlsx", xlsFile);

      // Generate and download the ZIP file
      zip.generateAsync({ type: "blob" }).then((content) => {
        saveAs(content, "repartition_complete.zip");
      });
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
    const updatedClasses = classes.filter((_, i) => i !== index);
    setClasses(updatedClasses);
  };

  return (
    <div className="max-w-4xl p-4 mx-auto space-y-7">
      <h3 className="text-2xl font-bold tracking-tighter text-center md:text-5xl lg:text-6xl">
        <AuroraText>FSJES</AuroraText> - Répartition des Lists
      </h3>

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
                <span>({cls.capacity})</span>
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

      <div className="flex mt-4 mb-6 space-x-4">
        <Input
          type="text"
          value={newClassName}
          onChange={(e) => setNewClassName(e.target.value)}
          placeholder="Local"
          className="w-1/2"
        />
        <Input
          type="number"
          value={newClassCapacity}
          onChange={(e) => setNewClassCapacity(e.target.value)}
          placeholder="Capacité"
          className="w-1/2"
        />
        <Button onClick={handleAddClass}>Ajouter Local</Button>
      </div>

      <div className="flex flex-col justify-between gap-1 mb-6">
        <Button onClick={repartitionFile}>Repartitionner</Button>
        {error && <p className="text-red-500">{error}</p>}
      </div>
    </div>
  );
}
