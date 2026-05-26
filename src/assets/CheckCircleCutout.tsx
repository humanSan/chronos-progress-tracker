import React, { useId } from "react";

interface Props {
  size?: number;
  strokeWidth?: number;
}

export default function CheckCircleCutout({ size = 24 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      style={{ fillRule: "evenodd", clipRule: "evenodd" }}
    >
      <g transform="">
        <path
          fill="currentColor"
          d="M12,1C18.071,1 23,5.929 23,12C23,18.071 18.071,23 12,23C5.929,23 1,18.071 1,12C1,5.929 5.929,1 12,1ZM6.439,13.061L9.439,16.061C10.025,16.646 10.975,16.646 11.561,16.061L17.561,10.061C18.146,9.475 18.146,8.525 17.561,7.939C16.975,7.354 16.025,7.354 15.439,7.939L10.5,12.879L8.561,10.939C7.975,10.354 7.025,10.354 6.439,10.939C5.854,11.525 5.854,12.475 6.439,13.061Z"
        />
      </g>
    </svg>
  );
}
