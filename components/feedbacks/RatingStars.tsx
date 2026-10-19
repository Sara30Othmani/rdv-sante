export default function RatingStars({

  value,

  onChange,

}: {

  value: number;

  onChange?: (v: number) => void;

}) {

  return (
<div className="flex gap-1" aria-label={`Note : ${value} sur 5`}>

      {[1, 2, 3, 4, 5].map((n) => (
<button

          key={n}

          type="button"

          disabled={!onChange}

          onClick={() => onChange?.(n)}

          className={`text-3xl leading-none ${onChange ? "h-11 w-11" : ""} ${

            n <= value ? "text-amber-400" : "text-gray-300"

          }`}
>

          ★
</button>

      ))}
</div>

  );

}
 