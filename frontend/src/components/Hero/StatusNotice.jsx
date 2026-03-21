const StatusNotice = ({ notice }) => {
  if (!notice) return null;

  const noticeClasses =
    notice.type === "success"
      ? "bg-green-50 border border-green-200 text-green-700"
      : "bg-amber-50 border border-amber-200 text-amber-700";

  const noticeIcon =
    notice.type === "success"
      ? "ri-checkbox-circle-line"
      : "ri-information-line";

  return (
    <div className={`mt-3 p-2.5 rounded-lg text-xs flex items-center gap-2 ${noticeClasses}`}>
      <i className={noticeIcon}></i>
      {notice.message}
    </div>
  );
};

export default StatusNotice;
