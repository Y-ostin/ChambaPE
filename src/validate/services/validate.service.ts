// src/validate/services/validate.service.ts
import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as pdfParse from 'pdf-parse';
import axios from 'axios';

@Injectable()
export class ValidateService {
  async validarCertificado(
    pdfPath: string,
    nombre: string,
    dni: string,
  ): Promise<{ valido: boolean; antecedentes: string[] }> {
    const buffer = await fs.readFile(pdfPath);
    const texto = (await pdfParse(buffer)).text.toLowerCase();

    const contieneNombre = texto.includes(nombre.toLowerCase());
    const contieneDni = texto.includes(dni);
    const contieneCert =
      texto.includes('certijoven') || texto.includes('certiadulto');

    // Buscar antecedentes
    const antecedentes: string[] = [];
    if (texto.includes('antecedente penal')) antecedentes.push('penal');
    if (texto.includes('antecedente judicial')) antecedentes.push('judicial');
    if (texto.includes('antecedente policial')) antecedentes.push('policial');

    const valido =
      contieneNombre &&
      contieneDni &&
      contieneCert &&
      antecedentes.length === 0;
    return { valido, antecedentes };
  }

  async consultarDatosReniec(dni: string): Promise<{ nombre: string }> {
    try {
      const { data } = await axios.get(
        `https://api.apis.net.pe/v1/dni?numero=${dni}`,
      );
      return {
        nombre: `${data.nombres} ${data.apellidoPaterno} ${data.apellidoMaterno}`,
      };
    } catch (err) {
      console.error('Error consultando RENIEC:', err.message);
      return { nombre: '' };
    }
  }
}
