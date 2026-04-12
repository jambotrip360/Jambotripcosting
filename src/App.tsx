{activeTab === "results" && (
  <div>
    <div
      style={{
        display: "grid",
        gap: "16px",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
      }}
    >
      <InfoCard title="Hotel Total" value={formatKES(hotelTotal)} />
      <InfoCard title="Activities Total" value={formatKES(activityTotal)} />
      <InfoCard title="Meals Total" value={formatKES(mealsTotal)} />
      <InfoCard
        title="Main Transport"
        value={formatKES(mainTransportTotal)}
      />
      <InfoCard
        title="Other Transport"
        value={formatKES(otherTransportTotal)}
      />
      <InfoCard title="Park Fees" value={formatKES(parkFeesTotal)} />
      <InfoCard title="Fuel Cost" value={formatKES(numberOrZero(fuelCost))} />
      <InfoCard
        title="Driver Allowance"
        value={formatKES(numberOrZero(driverAllowance))}
      />
    </div>

    <div
      style={{
        display: "grid",
        gap: "16px",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        marginTop: "16px",
      }}
    >
      <InfoCard title="Subtotal" value={formatKES(subtotal)} />
      <InfoCard title="Profit" value={formatKES(profit)} />
      <InfoCard title={pricingLabel} value={formatKES(perPerson)} />
      <InfoCard title="Final Total" value={formatKES(finalTotal)} />
    </div>

    <div
      style={{
        marginTop: "20px",
        ...cardStyle,
      }}
    >
      <h2 style={{ color: BRAND.header, marginTop: 0 }}>
        Detailed Breakdown
      </h2>

      <div style={{ display: "grid", gap: "10px", color: "#475569" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Hotel Total</span>
          <strong>{formatKES(hotelTotal)}</strong>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Activities Total</span>
          <strong>{formatKES(activityTotal)}</strong>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Meals Total</span>
          <strong>{formatKES(mealsTotal)}</strong>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Main Transport Total</span>
          <strong>{formatKES(mainTransportTotal)}</strong>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Other Transport Total</span>
          <strong>{formatKES(otherTransportTotal)}</strong>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Park Fees Total</span>
          <strong>{formatKES(parkFeesTotal)}</strong>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Fuel Cost</span>
          <strong>{formatKES(numberOrZero(fuelCost))}</strong>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Driver Allowance</span>
          <strong>{formatKES(numberOrZero(driverAllowance))}</strong>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid #E5EDF5",
            paddingTop: "10px",
            marginTop: "6px",
          }}
        >
          <span>Subtotal</span>
          <strong>{formatKES(subtotal)}</strong>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Markup %</span>
          <strong>{markupPercent}%</strong>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Profit</span>
          <strong>{formatKES(profit)}</strong>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid #E5EDF5",
            paddingTop: "10px",
            marginTop: "6px",
            fontSize: "18px",
            color: BRAND.header,
          }}
        >
          <span>Final Total</span>
          <strong>{formatKES(finalTotal)}</strong>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>{pricingLabel}</span>
          <strong>{formatKES(perPerson)}</strong>
        </div>
      </div>
    </div>
  </div>
)}