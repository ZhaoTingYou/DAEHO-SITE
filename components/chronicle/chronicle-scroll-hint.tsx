type ChronicleScrollHintProps = {
  visible: boolean;
};

export function ChronicleScrollHint({visible}: ChronicleScrollHintProps) {
  return (
    <div
      className={`chronicle-scroll-hint ${visible ? 'is-visible' : ''}`.trim()}
      aria-hidden="true"
    >
      <div className="home-scroll-hint chronicle-scroll-hint__motion">
        <span>Scroll</span>
        <span className="chronicle-scroll-hint__line" />
      </div>
    </div>
  );
}
