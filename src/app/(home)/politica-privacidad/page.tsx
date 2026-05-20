import React from "react";

const PoliticaPage = () => {
  return (
    <div className="w-[80%] mx-auto py-10 ">
      <div className="mx-auto bg-gray-200 text-stone-700 p-10 shadow-lg">
        <h1 className="text-2xl font-bold mb-4">Política de Privacidad</h1>

        <p className="mb-4">
          Esta Política de Privacidad describe cómo www.supercollectibles.com.mx
          (en adelante, el Sitio Web) recopila, utiliza y protege su información
          personal. Al utilizar este Sitio Web, usted acepta las prácticas
          descritas en esta política. Lea esta política detenidamente antes de
          usar el Sitio Web.
        </p>

        <h2 className="text-xl font-semibold mb-2">
          Recopilación de Información
        </h2>
        <p>
          Recopilamos información personal, como su nombre, dirección de correo
          electrónico, número de teléfono y otra información relevante, solo
          cuando usted nos la proporciona voluntariamente al utilizar nuestro
          sitio.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">
          Uso de la Información
        </h2>
        <p>Usamos su información personal para los siguientes propósitos:</p>
        <ul className="list-disc pl-8 mt-2">
          <li>Proporcionar información sobre nuestros servicios medicos.</li>
          <li>Procesar consultas y citas.</li>
          <li>Mejorar la calidad de nuestros servicios y nuestro sitio web.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6 mb-2">
          Protección de la Información
        </h2>
        <p>
          Implementamos medidas de seguridad para proteger su información
          personal. Sin embargo, tenga en cuenta que ninguna transmisión por
          Internet o sistema de almacenamiento es 100% seguro.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">
          Cookies y Tecnologías de Rastreo
        </h2>
        <p>
          Utilizamos cookies y tecnologías de rastreo, como Google y Facebook
          pixels, para recopilar información sobre su actividad en nuestro sitio
          web y para fines de análisis. Esta información se utiliza para mejorar
          la experiencia del usuario y la calidad de nuestros servicios. Puede
          configurar su navegador para rechazar todas las cookies o para que le
          informe cuando se envía una cookie.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">
          Divulgación de Información
        </h2>
        <p>
          No compartimos su información personal con terceros, excepto en los
          siguientes casos:
        </p>
        <ul className="list-disc pl-8 mt-2">
          <li>Para cumplir con la ley o en respuesta a solicitudes legales.</li>
          <li>
            Para proteger nuestros derechos, privacidad, seguridad o propiedad.
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-6 mb-2">
          Cambios en la Política de Privacidad
        </h2>
        <p>
          Reservamos el derecho de cambiar o modificar esta Política de
          Privacidad en cualquier momento. Los cambios se reflejarán en esta
          página, y es su responsabilidad revisar la política actualizada.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">Contacto</h2>
        <p>
          Para preguntas o inquietudes relacionadas con esta Política de
          Privacidad, por favor contáctenos en:
        </p>
        <ul className="list-disc pl-8">
          <li>Teléfono: +52 332 812 3760</li>
          <li>
            Av. Ignacio L Vallarta 2425, Arcos Vallarta, 44130 Guadalajara, Jal.
          </li>
          <li>Correo Electrónico: supercollectiblesc12@gmail.com</li>
        </ul>
      </div>
    </div>
  );
};

export default PoliticaPage;
