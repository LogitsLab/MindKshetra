/** Quiet image pairing per journey — atmosphere, not illustration. */
export function pathCover(id: string): string {
  switch (id) {
    case "anxiety-7":
    case "grief-7":
      return "/images/paths/mood.jpg";
    case "relationships-7":
      return "/images/paths/community.jpg";
    case "purpose-7":
      return "/images/paths/explore.jpg";
    case "student-7":
      return "/images/paths/sadhana.jpg";
    case "gita-21":
    default:
      return "/images/paths/paths.jpg";
  }
}
