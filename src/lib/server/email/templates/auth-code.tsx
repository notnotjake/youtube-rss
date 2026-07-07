import * as React from 'react'
import { Body, Preview, Container, Head, Heading, Html, Section, Text, Tailwind } from 'react-email'

type Options = {
	code: string
	maxAgeMins: number
}

const AuthCode = ({ code, maxAgeMins = 10 }: Options) => {
	return (
		<Html>
			<Preview>
				Use code {code} to log in. This code is available for {String(maxAgeMins)} minutes
			</Preview>
			<Tailwind>
				<Head>
					<meta name="color-scheme" content="light dark" />
					<meta name="supported-color-schemes" content="light dark" />
				</Head>
				<Body className="bg-white font-sans dark:bg-neutral-900">
					<Container className="w-full max-w-none bg-white pt-[50px] pb-[40px] dark:bg-neutral-900">
						<Section className="mx-auto max-w-[430px] px-1">
							<Heading className="m-0 text-[22px] font-semibold text-black dark:text-white">
								Log in to YouTube RSS
							</Heading>
							<Text className="mt-2 mb-0 text-[15px] text-neutral-600 dark:text-neutral-300">
								Use this code to securely log in
							</Text>

							<Section className="mt-8 mb-6">
								<Text className="m-0 box-border h-[50px] w-full rounded-[14px] bg-neutral-100 px-[24px] py-[14px] text-center font-mono text-[16px] font-medium text-black dark:bg-neutral-800 dark:text-white">
									{code}
								</Text>
							</Section>

							<Text className="m-0 text-[13px] text-neutral-500 dark:text-neutral-400">
								This code expires in {maxAgeMins} minutes. If you didn't request it, you can safely
								ignore this email.
							</Text>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	)
}

export default AuthCode

AuthCode.PreviewProps = {
	code: '434787',
	maxAgeMins: 10
} as Options
