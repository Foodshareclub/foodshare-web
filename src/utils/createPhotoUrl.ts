import type { ChangeEvent } from "react";

type CreatePhotoUrl = {
  file: File;
  filePath: string;
  url: string;
};

export const createPhotoUrl = (event: ChangeEvent<HTMLInputElement>): CreatePhotoUrl | undefined => {
  const file = event.target.files?.[0];
  if (!file) return undefined;
  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${fileName}`;
  const url = URL.createObjectURL(file);

  return { file, filePath, url };
};
