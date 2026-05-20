const FormattedPrice = ({ amount }) => {
  const formattedAmount = amount?.toLocaleString('en-US', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  });

  // Remove 'MX' from the formatted amount
  const amountWithoutMX = formattedAmount?.replace('MX', '').trim();

  return <>{amountWithoutMX}</>;
};

export default FormattedPrice;
