"use client";

const Error = ({ reset }: { reset: any }) => {
  return (
    <section className="py-24">
      <div className="container">
        <h2 className="mb-4 text-red-400">Algo salio mal! </h2>
        <button
          className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
          onClick={() => reset()}
        >
          vuelve a intentarlo
        </button>
      </div>
    </section>
  );
};
export default Error;
