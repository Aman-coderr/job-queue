export async function dummyExecutor(duration: number, failRate: number) {
  await new Promise((resolve) => setTimeout(resolve, duration * 1000));

  const roll = Math.random();
  if (roll < failRate) {
    throw new Error(`Dummy job failed intentionally (roll: ${roll.toFixed(2)}, failRate: ${failRate})`);
  }
}
