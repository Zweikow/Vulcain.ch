import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// L'import 'sst' sera résolu après le premier "npx sst dev"
import { Resource } from "sst";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    // 1. Vérification de l'authentification (à ajouter si nécessaire selon ton middleware)
    
    const { filename, contentType } = await req.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: "Missing filename or contentType" }, { status: 400 });
    }

    // 2. Générer un nom de fichier unique pour éviter les collisions
    const ext = filename.split(".").pop();
    const uniqueFilename = `${crypto.randomUUID()}.${ext}`;

    // 3. Préparer la commande S3
    const command = new PutObjectCommand({

      Bucket: Resource.PhotosBucket.name,
      Key: uniqueFilename,
      ContentType: contentType,
    });

    // 4. Initialiser le client AWS (les credentials sont injectés automatiquement par SST/AWS)
    // On force la région Francfort selon l'architecture cible
    const client = new S3Client({ region: "eu-central-1" });
    
    // 5. Générer l'URL présignée (valide 60 secondes)
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 });

    // 6. Construire l'URL finale publique de l'image

    const fileUrl = `https://${Resource.PhotosBucket.name}.s3.eu-central-1.amazonaws.com/${uniqueFilename}`;

    return NextResponse.json({ 


      uploadUrl,
      fileUrl
    });
  } catch (error) {
    console.error("Erreur lors de la génération de l'URL S3:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
