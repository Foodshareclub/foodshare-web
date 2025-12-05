import React from "react";

type PropsType = {
  img?: string;
};

const AvatarWithRipple: React.FC<PropsType> = ({ img }) => {
  const size = "96px";
  const color = "teal";

  return (
    <div className="flex justify-center items-center w-full overflow-hidden">
      {/* Ideally, only the box should be used. The <div /> is used to style the preview. */}
      <div
        className="relative"
        style={{
          width: size,
          height: size,
        }}
      >
        <div
          className="absolute block w-[300%] h-[300%] -ml-[100%] -mt-[100%] rounded-full animate-pulse-ring"
          style={{
            backgroundColor: color,
          }}
        />
        <div className="absolute top-0 w-full h-full">
          {img ? (
            <img src={img} alt="User avatar" className="w-full h-full rounded-full object-cover" loading="lazy" decoding="async" />
          ) : (
            <div className="w-full h-full rounded-full bg-muted flex items-center justify-center text-4xl">
              👤
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvatarWithRipple;
