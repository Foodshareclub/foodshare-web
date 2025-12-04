import tarlan from "../assets/Tarlan.png";
import denis from "../assets/den.jpg";
import imruz from "../assets/imrus.png";
import stanislav from "../assets/stanislav.png";
import telman from "../assets/telman.png";
import pitman from "../assets/pitman.png";
import pavel from "../assets/pavel.png";

export type MockTeamArr = {
  img: string;
  name: string;
  exp: string;
  about: string;
};

export const teamMockArray: Array<MockTeamArr> = [
  {
    name: "Tarlan Isaev",
    img: tarlan.src,
    exp: "Founder & CEO",
    about: "Founder of Foodshare",
  },
  {
    name: "Denis Yarmoshko",
    img: denis.src,
    exp: "Team Lead Frontend Engineer",
    about: "React frontend engineer. 4 years in development. Belarusian State Agrarian University",
  },
  {
    name: "Stanislav Lisovskii",
    img: stanislav.src,
    exp: "Frontend Engineer",
    about:
      "React frontend engineer. 4 years in development. Belarusian State University of Physical culture and Sport in Minsk.",
  },
  {
    name: "Telman Isaev",
    img: telman.src,
    exp: "Software Tester",
    about: "CEO of IT Computers. Hardware repair, 12+ years of experience in IT industry.",
  },
];
